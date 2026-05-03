import os
import io
import json
import base64
import numpy as np
import trimesh
import joblib
import pandas as pd
import shap
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
from features import extract_features, FEATURE_COLUMNS

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB

MAX_FILE_BYTES = 50 * 1024 * 1024   # 50 MB
MAX_REPAIR_BYTES = 10 * 1024 * 1024  # 10 MB

# ── Load model ────────────────────────────────────────────────────────────────
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
model = joblib.load(MODEL_PATH)
print(f"Loaded model from {MODEL_PATH}")

# ── SHAP explainer (instantiated once; fast for tree models) ──────────────────
explainer = shap.TreeExplainer(model)
print("SHAP explainer ready")

# ── RAG knowledge base ────────────────────────────────────────────────────────
KB_PATH = os.path.join(os.path.dirname(__file__), 'knowledge_base.json')
with open(KB_PATH) as f:
    KNOWLEDGE_BASE = json.load(f)
print(f"Loaded {len(KNOWLEDGE_BASE)} knowledge base entries")

# ── OpenAI client ─────────────────────────────────────────────────────────────
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))


# ── RAG retrieval ─────────────────────────────────────────────────────────────

def retrieve_context(feats):
    """Return relevant knowledge-base entries based on deterministic feature thresholds."""
    triggered = set()

    if not feats['is_watertight']:
        triggered.add('not_watertight')
    if not feats['is_winding_consistent']:
        triggered.add('inconsistent_winding')
    if feats['aspect_ratio'] > 5:
        triggered.add('high_aspect_ratio')
    if feats['sphericity'] < 0.3:
        triggered.add('low_sphericity')
    if feats['euler_number'] != 2:
        triggered.add('euler_not_2')
    if feats['sa_v_ratio'] > 50:
        triggered.add('high_sa_v_ratio')
    if feats['triangle_count'] < 500:
        triggered.add('low_triangle_count')

    # Only surface fabrication tips when the mesh is essentially clean
    if (feats['is_watertight'] and feats['is_winding_consistent']
            and feats['euler_number'] == 2 and feats['sphericity'] > 0.5
            and not triggered):
        triggered.add('near_perfect')

    return [e for e in KNOWLEDGE_BASE if e['trigger'] in triggered][:3]


# ── AI feedback (RAG-enhanced) ────────────────────────────────────────────────

def generate_feedback(feats, score, context_entries):
    bb = feats.get('bounding_box', {})

    context_block = ''
    if context_entries:
        chunks = '\n'.join(
            f'[{e["title"]}]: {e["content"]}' for e in context_entries
        )
        context_block = f'\n\nRelevant engineering guidelines:\n{chunks}'

    score_pct = round(score * 100)
    if score >= 0.7:
        score_label = 'strong'
        tone_guide = (
            'The score is strong. Be positive but calm — no exclamation points. '
            'Only flag issues if they genuinely matter.'
        )
    elif score >= 0.4:
        score_label = 'moderate'
        tone_guide = (
            'The score is moderate — acknowledge what is working well, then clearly explain '
            'the specific problems and why they matter in plain terms.'
        )
    else:
        score_label = 'weak'
        tone_guide = (
            'The score is weak — be direct about the problems found and explain in simple terms '
            'what they mean for the model\'s usability or printability.'
        )

    euler = feats['euler_number']
    if euler == 2:
        euler_note = '2 (normal closed shape — good)'
    elif euler < 2:
        euler_note = f'{euler} (below 2 — the shape may have handles, holes through it, or disconnected parts)'
    else:
        euler_note = f'{euler} (above 2 — the shape may have isolated internal pieces or mesh errors)'

    prompt = (
        f"You are a helpful 3D model analysis assistant. A designer uploaded an STL file and "
        f"it was automatically analyzed. Write 2-3 sentences of clear, friendly feedback about "
        f"the model's structural quality. {tone_guide} "
        f"Your audience is a general designer — avoid technical jargon entirely, or if a "
        f"technical term is unavoidable, explain it in plain English right away. "
        f"Reference the actual numbers (use the score as X/100, not decimals). "
        f"Do not use bullet points, headers, or em dashes (the long dash symbol). "
        f"Do not use exclamation points. Plain paragraph only. "
        f"Incorporate any relevant guidance from the engineering notes when applicable."
        f"{context_block}\n\n"
        f"Score: {score_pct}/100 ({score_label})\n"
        f"No holes (watertight): {bool(feats['is_watertight'])}\n"
        f"Surface normals consistent (faces point the right way): {bool(feats['is_winding_consistent'])}\n"
        f"Topology (Euler number): {euler_note}\n"
        f"Triangle count: {feats['triangle_count']:,}\n"
        f"Vertex count: {feats['vertex_count']:,}\n"
        f"Surface area: {feats['surface_area']} mm²\n"
        f"Volume: {feats['volume']} mm³"
        f"{' — estimate only, model has holes' if not feats['is_watertight'] else ''}\n"
        f"Dimensions: {bb.get('x')} × {bb.get('y')} × {bb.get('z')} mm\n"
        f"Aspect ratio: {feats['aspect_ratio']}:1 (1:1 = compact/cube-like, higher = long and thin)\n"
        f"Sphericity: {feats['sphericity']:.4f} (1.0 = perfect sphere, lower = more complex shape)\n"
        f"Average edge length: {feats['avg_edge_length']} mm"
    )

    response = openai_client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=200,
        temperature=0.4,
    )
    return response.choices[0].message.content.strip()


# ── Repair summary ────────────────────────────────────────────────────────────

def generate_repair_summary(repairs, original_score, repaired_score, orig_feats, rep_feats):
    repair_list = '\n'.join(f'- {r}' for r in repairs)
    delta = repaired_score - original_score
    direction = f"improved by {delta:.2f}" if delta > 0.005 else (
        f"decreased by {abs(delta):.2f}" if delta < -0.005 else "remained unchanged"
    )
    prompt = (
        f"You are a structural engineering repair agent. Summarize in 2 sentences what "
        f"was repaired and the net result. Be accurate. The score {direction} "
        f"(from {round(original_score * 100)}/100 to {round(repaired_score * 100)}/100). "
        f"Do not describe a decrease as an improvement. "
        f"Plain text only, no bullet points, no em dashes, no exclamation points.\n\n"
        f"Repairs performed:\n{repair_list}\n"
        f"Watertight: {bool(orig_feats['is_watertight'])} → {bool(rep_feats['is_watertight'])}\n"
        f"Normals consistent: {bool(orig_feats['is_winding_consistent'])} → "
        f"{bool(rep_feats['is_winding_consistent'])}"
    )
    response = openai_client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=120,
        temperature=0.3,
    )
    return response.choices[0].message.content.strip()


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.stl'):
        return jsonify({'error': 'File must be an .stl'}), 400

    file_bytes = file.read(MAX_FILE_BYTES + 1)
    if len(file_bytes) > MAX_FILE_BYTES:
        return jsonify({'error': 'File too large (max 50 MB)'}), 413

    try:
        mesh = trimesh.load(io.BytesIO(file_bytes), file_type='stl', force='mesh')

        feats = extract_features(mesh)

        X = pd.DataFrame([feats])[FEATURE_COLUMNS]
        score = float(np.clip(model.predict(X)[0], 0.0, 1.0))

        # SHAP feature contributions
        raw_shap = explainer.shap_values(X)
        shap_row = raw_shap[0] if raw_shap.ndim == 2 else raw_shap
        shap_dict = {
            col: round(float(shap_row[i]), 6)
            for i, col in enumerate(FEATURE_COLUMNS)
        }

        bounding_box = {
            'x': round(float(mesh.extents[0]), 4),
            'y': round(float(mesh.extents[1]), 4),
            'z': round(float(mesh.extents[2]), 4),
        }

        # RAG retrieval + AI feedback
        context_entries = retrieve_context(feats)
        feedback = None
        try:
            feedback = generate_feedback(
                {**feats, 'bounding_box': bounding_box}, score, context_entries
            )
        except Exception as e:
            print(f"OpenAI error: {e}")

        return jsonify({
            **feats,
            'score': round(score, 4),
            'bounding_box': bounding_box,
            'feedback': feedback,
            'shap_values': shap_dict,
        })

    except Exception as e:
        return jsonify({'error': f'Failed to process mesh: {str(e)}'}), 500


@app.route('/repair', methods=['POST'])
def repair():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename.lower().endswith('.stl'):
        return jsonify({'error': 'File must be an .stl'}), 400

    file_bytes = file.read(MAX_REPAIR_BYTES + 1)
    if len(file_bytes) > MAX_REPAIR_BYTES:
        return jsonify({'error': 'File too large for repair (max 10 MB)'}), 413

    try:
        mesh = trimesh.load(io.BytesIO(file_bytes), file_type='stl', force='mesh')

        orig_feats = extract_features(mesh)
        X_orig = pd.DataFrame([orig_feats])[FEATURE_COLUMNS]
        original_score = float(np.clip(model.predict(X_orig)[0], 0.0, 1.0))

        repairs_applied = []

        # Fix inconsistent winding
        if not mesh.is_winding_consistent:
            trimesh.repair.fix_winding(mesh)
            if mesh.is_winding_consistent:
                repairs_applied.append(
                    'Fixed inconsistent face winding — all normals now point outward'
                )

        # Recalculate normals after winding fix
        trimesh.repair.fix_normals(mesh)

        # Fill holes
        if not mesh.is_watertight:
            was_open = True
            trimesh.repair.fill_holes(mesh)
            if mesh.is_watertight:
                repairs_applied.append('Filled open holes — mesh is now watertight')
            else:
                repairs_applied.append(
                    'Attempted hole filling — some open edges remain (complex topology)'
                )

        # Remove degenerate faces (near-zero area)
        try:
            areas = mesh.area_faces
            mask = areas > 1e-10
            if not mask.all():
                removed = int((~mask).sum())
                mesh.update_faces(mask)
                if removed > 0:
                    repairs_applied.append(
                        f'Removed {removed} degenerate triangle(s) with near-zero area'
                    )
        except Exception:
            pass

        if not repairs_applied:
            repairs_applied.append(
                'No significant issues detected. Mesh is already in good condition.'
            )

        rep_feats = extract_features(mesh)
        X_rep = pd.DataFrame([rep_feats])[FEATURE_COLUMNS]
        repaired_score = float(np.clip(model.predict(X_rep)[0], 0.0, 1.0))

        repair_summary = None
        try:
            repair_summary = generate_repair_summary(
                repairs_applied, original_score, repaired_score, orig_feats, rep_feats
            )
        except Exception as e:
            print(f'OpenAI repair summary error: {e}')

        repaired_bytes = mesh.export(file_type='stl')
        repaired_b64 = base64.b64encode(repaired_bytes).decode('utf-8')

        return jsonify({
            'original_score': round(original_score, 4),
            'repaired_score': round(repaired_score, 4),
            'repairs_applied': repairs_applied,
            'repair_summary': repair_summary,
            'repaired_stl_b64': repaired_b64,
            'repaired_features': rep_feats,
        })

    except Exception as e:
        return jsonify({'error': f'Repair failed: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
