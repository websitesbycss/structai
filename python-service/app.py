import os
import io
import numpy as np
import trimesh
import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv
from features import extract_features, FEATURE_COLUMNS

load_dotenv()

app = Flask(__name__)
CORS(app)

# Load ML model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
model = joblib.load(MODEL_PATH)
print(f"Loaded model from {MODEL_PATH}")

# OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))


def generate_feedback(feats, score):
    """Call OpenAI to generate natural language structural feedback."""
    bb = feats.get('bounding_box', {})
    prompt = f"""You are a structural engineering analysis tool. A user uploaded a 3D model (.stl file) and it was analyzed. Write 2-3 sentences of concise, specific feedback about its structural integrity based on the data below. Reference the actual numbers. Do not use bullet points or headers — plain paragraph only.

Structural score: {score:.2f}/1.00
Watertight: {bool(feats['is_watertight'])}
Consistent normals: {bool(feats['is_winding_consistent'])}
Euler number: {feats['euler_number']}
Triangles: {feats['triangle_count']:,}
Vertices: {feats['vertex_count']:,}
Surface area: {feats['surface_area']} mm²
Volume: {feats['volume']} mm³ {'(non-watertight, volume unreliable)' if not feats['is_watertight'] else ''}
Bounding box: {bb.get('x')} × {bb.get('y')} × {bb.get('z')} mm
Aspect ratio: {feats['aspect_ratio']}:1
Sphericity: {feats['sphericity']:.4f}
Avg edge length: {feats['avg_edge_length']} mm"""

    response = openai_client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[{'role': 'user', 'content': prompt}],
        max_tokens=200,
        temperature=0.4,
    )
    return response.choices[0].message.content.strip()


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

    try:
        file_bytes = file.read()
        mesh = trimesh.load(io.BytesIO(file_bytes), file_type='stl', force='mesh')

        # Extract features
        feats = extract_features(mesh)

        # Predict structural score
        X = pd.DataFrame([feats])[FEATURE_COLUMNS]
        score = float(np.clip(model.predict(X)[0], 0.0, 1.0))

        # Build display extras
        bounding_box = {
            'x': round(float(mesh.extents[0]), 4),
            'y': round(float(mesh.extents[1]), 4),
            'z': round(float(mesh.extents[2]), 4),
        }

        # Generate AI feedback (gracefully degrade if OpenAI fails)
        feedback = None
        try:
            feedback = generate_feedback({**feats, 'bounding_box': bounding_box}, score)
        except Exception as e:
            print(f"OpenAI error: {e}")

        response = {
            **feats,
            'score': round(score, 4),
            'bounding_box': bounding_box,
            'feedback': feedback,
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': f'Failed to process mesh: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
