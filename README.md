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
| ML | scikit-learn (Random Forest), trained on synthetic mesh dataset |
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

## Score Guide

| Range | Label |
|---|---|
| 0.70 – 1.00 | Strong structural integrity |
| 0.40 – 0.69 | Moderate — may need improvements |
| 0.00 – 0.39 | Weak — significant issues detected |
