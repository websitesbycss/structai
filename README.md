# StructAI

AI-powered structural integrity analyzer for 3D models. Upload any `.stl` file and get an instant integrity score, geometric metrics, and natural-language improvement feedback — all in the browser.

**Live site:** [structai.vercel.app](https://structai.vercel.app) &nbsp;·&nbsp; **API:** [structai-production.up.railway.app](https://structai-production.up.railway.app/health)

---

## Features

- **Structural score** — ML model trained on hundreds of meshes outputs a 0–1 integrity score
- **Mesh metrics** — volume, surface area, triangle/vertex count, bounding box, aspect ratio, watertight check, normal consistency, Euler number
- **AI feedback** — GPT-4o-mini generates concise, data-driven improvement recommendations
- **Interactive 3D viewer** — Three.js renderer lets you rotate and inspect the model in the browser
- **Auth** — Clerk-powered sign-in/sign-up, required before uploading

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router |
| Auth | Clerk |
| 3D rendering | Three.js |
| Backend | Flask, Gunicorn |
| ML | scikit-learn (Gradient Boosting), trained on synthetic mesh dataset |
| Mesh processing | trimesh |
| AI feedback | OpenAI API (gpt-4o-mini) |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

## Project Structure

```
structai/
├── src/
│   ├── pages/
│   │   ├── Home.jsx        # Landing page with preview + about sections
│   │   ├── Upload.jsx      # File upload, analysis progress, results view
│   │   ├── About.jsx       # Standalone about page
│   │   └── Auth.jsx        # Clerk sign-in/sign-up
│   ├── components/
│   │   ├── Navbar.jsx
│   │   └── STLViewer.jsx   # Three.js STL renderer
│   └── assets/
├── python-service/
│   ├── app.py              # Flask API (/analyze, /health)
│   ├── features.py         # trimesh feature extraction
│   ├── train_model.py      # Model training script
│   ├── generate_dataset.py # Synthetic dataset generation
│   ├── model.joblib        # Trained scikit-learn model
│   ├── requirements.txt
│   └── Procfile
└── public/
```

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.10+

### Frontend

```bash
npm install
npm run dev
```

Runs at `http://localhost:5173`.

### Backend

```bash
cd python-service
pip install -r requirements.txt
python app.py
```

Runs at `http://localhost:5000`.

Create `python-service/.env`:

```env
OPENAI_API_KEY=your_openai_key
```

### Environment Variables

Create `.env.local` in the project root:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
VITE_API_URL=http://localhost:5000
```

## Deployment

### Frontend (Vercel)

Set the following environment variables in your Vercel project settings:

| Variable | Value |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Your Clerk publishable key |
| `VITE_API_URL` | Your Railway backend URL (no trailing slash) |

### Backend (Railway)

Set the following environment variables in your Railway service:

| Variable | Value |
|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key |

The `Procfile` configures gunicorn automatically. Railway injects `PORT` at runtime.

## ML Model

The model is a scikit-learn pipeline trained on a synthetic dataset of 3D meshes with known structural properties. Features include volume, surface area, triangle count, aspect ratio, sphericity, normal consistency, and watertight status. The output is a continuous score from 0 (structurally weak) to 1 (excellent integrity).

To retrain:

```bash
cd python-service
python generate_dataset.py   # regenerate training data
python train_model.py        # retrain and save model.joblib
```

## Scoring Algorithm

The integrity score is a continuous value from **0.0** (structurally weak) to **1.0** (excellent). Scores are produced by a `GradientBoostingRegressor` trained to approximate the following deterministic engineering formula, which was used to label the synthetic training dataset.

### Formula

```
score = 0.25 (baseline)
      + watertight bonus       (up to +0.25)
      + normal consistency     (+0.05)
      + topology bonus         (+0.05)
      + sphericity reward      (up to +0.40)
      − aspect ratio penalty   (up to −0.25)
      + noise                  (σ = 0.015, training only)
```

### Component Breakdown

**Baseline — `+0.25`**
Every mesh starts here regardless of quality.

**Watertight — `+0.25`**
A watertight mesh has no holes, gaps, or open edges — every edge is shared by exactly two faces. This is the single largest factor. A non-watertight mesh (open shell, missing faces) receives no bonus and also disqualifies the sphericity reward.

**Consistent normals — `+0.05`**
All face normals must wind in a consistent direction (all outward or all inward). Inconsistent winding indicates inverted faces, which causes rendering and manufacturing defects.

**Euler number == 2 — `+0.05`**
The Euler characteristic `V − E + F = 2` holds for any topologically valid closed surface (genus 0, like a sphere or a box). Tori score 0 here (Euler = 0) due to their hole. Corrupted or degenerate meshes often produce unexpected Euler numbers.

**Sphericity — `up to +0.40`**
Sphericity measures how close a shape's surface-to-volume ratio is to that of a perfect sphere:

```
sphericity = (π^(1/3) × (6V)^(2/3)) / A
```

Where `V` is volume and `A` is surface area. A perfect sphere scores 1.0, earning the full `+0.40`. Flat slabs, thin rods, and hollow shells approach 0. Only applied when the mesh is watertight (volume is meaningful).

**Aspect ratio penalty — `up to −0.25`**
Computed as `max_extent / min_extent` across the bounding box axes. A perfect cube has aspect ratio 1 (no penalty). The penalty scales as:

```
penalty = min(0.25, (aspect_ratio − 1) × 0.025)
```

This reaches its cap of `−0.25` at an aspect ratio of 11 (e.g. a rod 11× longer than it is wide).

### Maximum Possible Score

A perfect sphere achieves the theoretical maximum:

| Component | Value |
|---|---|
| Baseline | +0.25 |
| Watertight | +0.25 |
| Consistent normals | +0.05 |
| Euler number == 2 | +0.05 |
| Sphericity (= 1.0) | +0.40 |
| Aspect ratio (= 1.0) | −0.00 |
| **Total** | **1.00** |

### What the ML Model Adds

The `GradientBoostingRegressor` (300 estimators, learning rate 0.05, max depth 4) is trained on **987 synthetic meshes** across six categories:

| Category | Count | Purpose |
|---|---|---|
| Intact primitives | 622 | Boxes, cylinders, spheres, cones, tori, capsules |
| Corrupted (face removal) | 120 | Non-watertight meshes with random holes |
| Winding-inconsistent | 140 | Watertight meshes with 8–50% of faces flipped — the only source of `is_winding_consistent = 0` in the dataset |
| Multi-component | 26 | Two or three separate primitives concatenated — Euler = 4 or 6 |
| Open shells / extra tori | 79 | Capless cylinders, hemispheres, extended tori grid — varied Euler numbers and non-watertight topology |

Rather than applying the formula directly at inference time, the model learns non-linear interactions between features — for example, how SA/V ratio and aspect ratio together predict structural weakness in ways the formula alone doesn't fully capture. The final score is clipped to `[0.0, 1.0]`.

**Feature importances (from last training run):**

| Feature | Importance |
|---|---|
| sphericity | 0.7336 |
| is_watertight | 0.1817 |
| aspect_ratio | 0.0602 |
| volume | 0.0141 |
| euler_number | 0.0036 |
| is_winding_consistent | 0.0032 |
| triangle_count | 0.0012 |
| avg_edge_length | 0.0009 |
| surface_area | 0.0007 |
| sa_v_ratio | 0.0005 |
| vertex_count | 0.0004 |

## Score Guide

| Range | Label |
|---|---|
| 0.70 – 1.00 | Strong structural integrity |
| 0.40 – 0.69 | Moderate — may need improvements |
| 0.00 – 0.39 | Weak — significant issues detected |
