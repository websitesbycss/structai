import os
import io
import numpy as np
import trimesh
import joblib
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from features import extract_features, FEATURE_COLUMNS

app = Flask(__name__)
CORS(app)

# Load model once at startup
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.joblib')
model = joblib.load(MODEL_PATH)
print(f"Loaded model from {MODEL_PATH}")


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

        # Build response — features + score + display extras
        response = {
            **feats,
            'score': round(score, 4),
            'bounding_box': {
                'x': round(float(mesh.extents[0]), 4),
                'y': round(float(mesh.extents[1]), 4),
                'z': round(float(mesh.extents[2]), 4),
            },
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({'error': f'Failed to process mesh: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
