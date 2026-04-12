import numpy as np


def extract_features(mesh):
    """
    Extract structural features from a trimesh object.
    Used by both generate_dataset.py (training) and app.py (inference)
    so training and inference are always identical.
    """
    is_watertight         = bool(mesh.is_watertight)
    is_winding_consistent = bool(mesh.is_winding_consistent)
    euler_number          = int(mesh.euler_number)
    triangle_count        = int(len(mesh.faces))
    vertex_count          = int(len(mesh.vertices))
    surface_area          = float(mesh.area)

    # Volume only meaningful for watertight meshes
    volume = float(mesh.volume) if is_watertight else 0.0

    # Surface-area-to-volume ratio (compactness proxy)
    # A sphere minimises this; thin rods / flat slabs maximise it
    sa_v_ratio = surface_area / volume if volume > 0 else 999.0

    # Sphericity: 1.0 = perfect sphere, approaches 0 for flat/thin shapes
    if volume > 0:
        sphericity = (np.pi ** (1 / 3) * (6 * volume) ** (2 / 3)) / surface_area
    else:
        sphericity = 0.0

    # Aspect ratio: max extent / min extent
    extents = sorted(mesh.extents)
    aspect_ratio = extents[2] / extents[0] if extents[0] > 0 else 99.0

    # Average unique edge length
    avg_edge_length = float(np.mean(mesh.edges_unique_length))

    return {
        'is_watertight':         int(is_watertight),
        'is_winding_consistent': int(is_winding_consistent),
        'euler_number':          euler_number,
        'triangle_count':        triangle_count,
        'vertex_count':          vertex_count,
        'surface_area':          round(surface_area, 6),
        'volume':                round(volume, 6),
        'sa_v_ratio':            round(min(sa_v_ratio, 999.0), 6),
        'sphericity':            round(sphericity, 6),
        'aspect_ratio':          round(aspect_ratio, 6),
        'avg_edge_length':       round(avg_edge_length, 6),
    }


# Column order must stay fixed — model was trained on this exact order
FEATURE_COLUMNS = [
    'is_watertight',
    'is_winding_consistent',
    'euler_number',
    'triangle_count',
    'vertex_count',
    'surface_area',
    'volume',
    'sa_v_ratio',
    'sphericity',
    'aspect_ratio',
    'avg_edge_length',
]
