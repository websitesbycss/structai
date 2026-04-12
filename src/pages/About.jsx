import Navbar from '../components/Navbar'
import './About.css'

export default function About() {
  return (
    <div className="about-page">
      <Navbar />
      <main className="about-body">
        <div className="about-container">
          <h1 className="about-title">About StructAI</h1>
          <p className="about-lead">
            StructAI is an AI-powered tool for analyzing the structural integrity of 3D models.
            Upload any <span className="about-accent">.stl</span> file and get instant,
            data-driven feedback in seconds.
          </p>

          <div className="about-grid">
            <div className="about-card">
              <div className="about-card-icon">⚙️</div>
              <h3>How It Works</h3>
              <p>
                Your 3D model is processed by our backend using trimesh, a Python library for
                3D mesh analysis. We extract key metrics — volume, surface area, triangle count,
                normal consistency, and more — and feed them into a custom machine learning model.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">🤖</div>
              <h3>The ML Model</h3>
              <p>
                Our scikit-learn model was trained on hundreds of 3D meshes with known structural
                properties, from thin fragile rods to solid structural blocks. It scores your
                model from <strong>0</strong> (structurally weak) to <strong>1</strong> (excellent integrity).
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">💬</div>
              <h3>AI Feedback</h3>
              <p>
                Beyond the score, StructAI uses a large language model to generate natural-language
                feedback about your design — highlighting specific strengths, weaknesses, and
                recommendations for improvement.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon">🔭</div>
              <h3>3D Viewer</h3>
              <p>
                After upload, your model is rendered interactively in the browser using Three.js.
                Rotate it 360° to inspect it from every angle while reading your structural analysis.
              </p>
            </div>
          </div>

          <div className="about-score-legend">
            <h3 className="about-legend-title">Score Guide</h3>
            <div className="about-legend-items">
              <div className="about-legend-item">
                <span className="about-legend-dot" style={{ background: 'var(--score-green)' }} />
                <span><strong style={{ color: 'var(--score-green)' }}>0.7 – 1.0</strong> — Strong structural integrity</span>
              </div>
              <div className="about-legend-item">
                <span className="about-legend-dot" style={{ background: 'var(--score-yellow)' }} />
                <span><strong style={{ color: 'var(--score-yellow)' }}>0.4 – 0.69</strong> — Moderate, may need improvements</span>
              </div>
              <div className="about-legend-item">
                <span className="about-legend-dot" style={{ background: 'var(--score-red)' }} />
                <span><strong style={{ color: 'var(--score-red)' }}>0.0 – 0.39</strong> — Weak, significant issues detected</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
