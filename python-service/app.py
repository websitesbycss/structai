import os
import io
import numpy as np
import trimesh
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


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

        # ── Core mesh features ─────────────────────────────────────────────
        triangle_count = int(len(mesh.faces))
        vertex_count   = int(len(mesh.vertices))
        is_watertight  = bool(mesh.is_watertight)
        is_winding_consistent = bool(mesh.is_winding_consistent)
        euler_number   = int(mesh.euler_number)

        # Volume and surface area (only meaningful for watertight meshes,
        # but we return them regardless and flag on the frontend)
        volume       = float(mesh.volume)       if is_watertight else None
        surface_area = float(mesh.area)

        # Bounding box extents (x, y, z dimensions)
        extents = mesh.extents.tolist()

        # Aspect ratio — ratio of longest to shortest axis
        sorted_extents = sorted(extents)
        aspect_ratio = round(sorted_extents[-1] / sorted_extents[0], 3) if sorted_extents[0] > 0 else None

        # Average edge length
        edge_lengths = mesh.edges_unique_length
        avg_edge_length = float(np.mean(edge_lengths))

        features = {
            'triangle_count':        triangle_count,
            'vertex_count':          vertex_count,
            'surface_area':          round(surface_area, 4),
            'volume':                round(volume, 4) if volume is not None else None,
            'is_watertight':         is_watertight,
            'is_winding_consistent': is_winding_consistent,
            'euler_number':          euler_number,
            'bounding_box': {
                'x': round(extents[0], 4),
                'y': round(extents[1], 4),
                'z': round(extents[2], 4),
            },
            'aspect_ratio':          aspect_ratio,
            'avg_edge_length':       round(avg_edge_length, 4),
        }

        return jsonify(features)

    except Exception as e:
        return jsonify({'error': f'Failed to process mesh: {str(e)}'}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
