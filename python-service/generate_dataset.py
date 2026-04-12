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
    corrupted_meshes = make_corrupted(good_meshes)
    all_meshes = good_meshes + corrupted_meshes

    print(f"  {len(good_meshes)} intact shapes + {len(corrupted_meshes)} corrupted = {len(all_meshes)} total")

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
    print(f"Saved dataset.csv  ({len(df)} rows)")

    # Score distribution summary
    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.01]
    labels = ['0.0–0.2', '0.2–0.4', '0.4–0.6', '0.6–0.8', '0.8–1.0']
    df['bucket'] = pd.cut(df['score'], bins=bins, labels=labels, right=False)
    print("\nScore distribution:")
    print(df['bucket'].value_counts().sort_index().to_string())

    return df


if __name__ == '__main__':
    build_dataset()
