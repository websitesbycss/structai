"""
Generate a synthetic training dataset by creating trimesh primitives
with known structural properties and scoring them with an engineering formula.

Score breakdown (0–1):
  - Watertight mesh:          up to +0.25
  - Consistent normals:       +0.05
  - Euler number == 2:        +0.05
  - Sphericity (compactness): up to +0.40
  - Aspect ratio penalty:     up to -0.25
  Small Gaussian noise is added to each score for realism.
"""

import numpy as np
import pandas as pd
import trimesh
from features import extract_features

rng = np.random.default_rng(42)


# ── Scoring formula ────────────────────────────────────────────────────────

def score_mesh(mesh):
    score = 0.25  # baseline

    if mesh.is_watertight:
        score += 0.25
    if mesh.is_winding_consistent:
        score += 0.05
    if mesh.euler_number == 2:
        score += 0.05

    # Sphericity reward — compact shapes score higher
    if mesh.is_watertight and mesh.volume > 0:
        sphericity = (np.pi ** (1 / 3) * (6 * mesh.volume) ** (2 / 3)) / mesh.area
        score += sphericity * 0.40

    # Aspect ratio penalty — thin rods and flat slabs score lower
    extents = sorted(mesh.extents)
    if extents[0] > 0:
        aspect = extents[2] / extents[0]
        score -= min(0.25, (aspect - 1) * 0.025)

    # Small noise so the model sees variation, not a perfect formula
    score += rng.normal(0, 0.015)

    return float(np.clip(score, 0.0, 1.0))


# ── Shape generators ───────────────────────────────────────────────────────

def make_boxes():
    """Boxes from near-cubic (good) to extreme slabs/rods (bad)."""
    meshes = []
    dims = [0.2, 0.5, 1, 2, 4, 8, 16, 32]
    for x in dims:
        for y in dims:
            for z in dims:
                meshes.append(trimesh.creation.box([x, y, z]))
    return meshes


def make_cylinders():
    """Cylinders from stubby discs to thin rods."""
    meshes = []
    for r in [0.1, 0.3, 0.5, 1, 2, 4, 8]:
        for h in [0.1, 0.5, 1, 2, 5, 10, 20, 40]:
            meshes.append(trimesh.creation.cylinder(radius=r, height=h, sections=32))
    return meshes


def make_spheres():
    """Spheres of various sizes — should score ~0.95."""
    return [
        trimesh.creation.icosphere(subdivisions=3, radius=r)
        for r in [0.5, 1, 2, 5, 10, 20]
    ]


def make_cones():
    """Cones — moderate scores due to tapering."""
    meshes = []
    for r in [0.5, 1, 2, 5]:
        for h in [0.5, 1, 2, 5, 10, 20]:
            meshes.append(trimesh.creation.cone(radius=r, height=h, sections=32))
    return meshes


def make_tori():
    """Tori — good scores, euler_number = 0 (hole)."""
    meshes = []
    for major in [2, 4, 8]:
        for minor in [0.2, 0.5, 1, 1.5]:
            if minor < major:
                meshes.append(trimesh.creation.torus(major_radius=major, minor_radius=minor))
    return meshes


def make_capsules():
    """Capsules (cylinder + hemisphere caps) — good compact scores."""
    meshes = []
    for r in [0.5, 1, 2]:
        for h in [1, 2, 4, 8]:
            meshes.append(trimesh.creation.capsule(radius=r, height=h))
    return meshes


def make_corrupted(good_meshes, n=120):
    """
    Create non-watertight meshes by deleting random faces from good meshes.
    These should score low due to missing geometry.
    """
    corrupted = []
    indices = rng.choice(len(good_meshes), size=n, replace=True)
    for i in indices:
        m = good_meshes[i].copy()
        n_remove = max(1, int(len(m.faces) * rng.uniform(0.05, 0.25)))
        keep = np.ones(len(m.faces), dtype=bool)
        remove_idx = rng.choice(len(m.faces), size=n_remove, replace=False)
        keep[remove_idx] = False
        corrupted.append(trimesh.Trimesh(vertices=m.vertices, faces=m.faces[keep]))
    return corrupted


def make_winding_inconsistent(good_meshes, n=140):
    """
    Create meshes with inconsistent face winding by flipping a random fraction
    of faces. Winding is flipped by swapping the second and third vertex indices
    of selected faces, reversing those face normals. process=False prevents
    trimesh from auto-fixing the winding on load.
    """
    meshes = []
    indices = rng.choice(len(good_meshes), size=n, replace=True)
    for i in indices:
        m = good_meshes[i].copy()
        faces = m.faces.copy()
        fraction = rng.uniform(0.08, 0.50)
        n_flip = max(1, int(len(faces) * fraction))
        flip_idx = rng.choice(len(faces), size=n_flip, replace=False)
        # Swap columns 1 and 2 to reverse winding on selected faces
        faces[flip_idx] = faces[flip_idx][:, [0, 2, 1]]
        meshes.append(trimesh.Trimesh(vertices=m.vertices, faces=faces, process=False))
    return meshes


def _concatenate(mesh_list):
    """Manually concatenate meshes so trimesh doesn't merge shared vertices."""
    verts, faces = [], []
    offset = 0
    for m in mesh_list:
        verts.append(m.vertices)
        faces.append(m.faces + offset)
        offset += len(m.vertices)
    return trimesh.Trimesh(
        vertices=np.vstack(verts),
        faces=np.vstack(faces),
        process=False,
    )


def make_multi_component(good_meshes):
    """
    Combine 2–3 separate watertight primitives into one mesh object.
    Each closed component contributes +2 to the Euler number, so
    two components → Euler=4, three → Euler=6.
    Components are spread apart so they don't intersect.
    """
    meshes = []
    primitives = [good_meshes[i] for i in rng.choice(len(good_meshes), size=60, replace=True)]

    # Two-component meshes (Euler ≈ 4)
    for k in range(0, 40, 2):
        a = primitives[k].copy()
        b = primitives[k + 1].copy()
        gap = max(a.extents.max(), b.extents.max()) + 2.0
        b.apply_translation([gap, 0, 0])
        meshes.append(_concatenate([a, b]))

    # Three-component meshes (Euler ≈ 6)
    for k in range(0, 18, 3):
        parts = [primitives[k + j].copy() for j in range(3)]
        for j, p in enumerate(parts):
            gap = p.extents.max() + 2.0
            p.apply_translation([j * gap * 1.5, 0, 0])
        meshes.append(_concatenate(parts))

    return meshes


def make_open_shells():
    """
    Meshes with open boundaries — no end caps on cylinders, or truncated
    spheres. Non-watertight with varied Euler numbers (often 0 or 1).
    """
    meshes = []

    # Open-ended cylinders: remove top and bottom cap faces by z-normal threshold
    for r in [0.5, 1, 2, 4, 8]:
        for h in [0.5, 1, 2, 5, 10, 20]:
            cyl = trimesh.creation.cylinder(radius=r, height=h, sections=32)
            normals = cyl.face_normals
            side_mask = np.abs(normals[:, 2]) < 0.85
            faces = cyl.faces[side_mask]
            if len(faces) > 0:
                meshes.append(trimesh.Trimesh(vertices=cyl.vertices, faces=faces, process=False))

    # Hemispheres: keep only upper-half faces of a sphere
    for subdiv in [2, 3]:
        for r in [0.5, 1, 2, 5, 10]:
            sphere = trimesh.creation.icosphere(subdivisions=subdiv, radius=r)
            centers = sphere.vertices[sphere.faces].mean(axis=1)
            upper = centers[:, 2] > 0
            faces = sphere.faces[upper]
            if len(faces) > 0:
                meshes.append(trimesh.Trimesh(vertices=sphere.vertices, faces=faces, process=False))

    # Expanded tori grid — euler_number = 0
    for major in [1, 2, 3, 4, 6, 8, 12]:
        for minor in [0.1, 0.3, 0.5, 0.8, 1.2, 2.0]:
            if minor < major * 0.9:
                try:
                    meshes.append(trimesh.creation.torus(major_radius=major, minor_radius=minor))
                except Exception:
                    pass

    return meshes


# ── Build dataset ──────────────────────────────────────────────────────────

def build_dataset():
    print("Generating shapes...")
    good_meshes = (
        make_boxes() +
        make_cylinders() +
        make_spheres() +
        make_cones() +
        make_tori() +
        make_capsules()
    )

    corrupted_meshes     = make_corrupted(good_meshes)
    winding_bad_meshes   = make_winding_inconsistent(good_meshes)
    multi_meshes         = make_multi_component(good_meshes)
    open_shell_meshes    = make_open_shells()

    all_meshes = good_meshes + corrupted_meshes + winding_bad_meshes + multi_meshes + open_shell_meshes

    print(f"  {len(good_meshes)} intact")
    print(f"  {len(corrupted_meshes)} corrupted (non-watertight)")
    print(f"  {len(winding_bad_meshes)} winding-inconsistent")
    print(f"  {len(multi_meshes)} multi-component")
    print(f"  {len(open_shell_meshes)} open shells / extra tori")
    print(f"  {len(all_meshes)} total")

    rows = []
    skipped = 0
    for mesh in all_meshes:
        try:
            feats = extract_features(mesh)
            score = score_mesh(mesh)
            rows.append({**feats, 'score': score})
        except Exception:
            skipped += 1

    print(f"  {skipped} shapes skipped due to errors")

    df = pd.DataFrame(rows)
    df.to_csv('dataset.csv', index=False)
    print(f"\nSaved dataset.csv  ({len(df)} rows)")

    # Distribution summary
    print("\nis_winding_consistent:")
    print(df['is_winding_consistent'].value_counts().to_string())

    print("\neuler_number (top values):")
    print(df['euler_number'].value_counts().sort_index().to_string())

    print("\nis_watertight:")
    print(df['is_watertight'].value_counts().to_string())

    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.01]
    labels = ['0.0–0.2', '0.2–0.4', '0.4–0.6', '0.6–0.8', '0.8–1.0']
    df['bucket'] = pd.cut(df['score'], bins=bins, labels=labels, right=False)
    print("\nScore distribution:")
    print(df['bucket'].value_counts().sort_index().to_string())

    return df


if __name__ == '__main__':
    build_dataset()