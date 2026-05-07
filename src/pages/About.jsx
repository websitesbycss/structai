import Navbar from '../components/Navbar'
import './About.css'

const HowItWorksIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07M8.46 8.46a5 5 0 0 0 0 7.07"/>
  </svg>
)

const MLModelIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="4" height="4" rx="1"/>
    <rect x="16" y="4" width="4" height="4" rx="1"/>
    <rect x="4" y="16" width="4" height="4" rx="1"/>
    <rect x="16" y="16" width="4" height="4" rx="1"/>
    <rect x="10" y="10" width="4" height="4" rx="1"/>
    <line x1="6" y1="8" x2="10" y2="10"/>
    <line x1="18" y1="8" x2="14" y2="10"/>
    <line x1="6" y1="16" x2="10" y2="14"/>
    <line x1="18" y1="16" x2="14" y2="14"/>
  </svg>
)

const AIFeedbackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M8 10h8M8 14h5"/>
  </svg>
)

const ViewerIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

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
              <div className="about-card-icon"><HowItWorksIcon /></div>
              <h3>How It Works</h3>
              <p>
                Your 3D model is processed by our backend using trimesh, a Python library for
                3D mesh analysis. We extract key metrics (volume, surface area, triangle count,
                normal consistency, and more) and feed them into a custom machine learning model.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon"><MLModelIcon /></div>
              <h3>The ML Model</h3>
              <p>
                Our scikit-learn model was trained on hundreds of 3D meshes with known structural
                properties, from thin fragile rods to solid structural blocks. It scores your
                model from <strong>0</strong> (structurally weak) to <strong>100</strong> (excellent integrity).
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon"><AIFeedbackIcon /></div>
              <h3>AI Feedback</h3>
              <p>
                Beyond the score, StructAI uses a large language model to generate natural-language
                feedback about your design, highlighting specific strengths, weaknesses, and
                recommendations for improvement.
              </p>
            </div>

            <div className="about-card">
              <div className="about-card-icon"><ViewerIcon /></div>
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
                <span><strong style={{ color: 'var(--score-green)' }}>70–100</strong> — Strong structural integrity. Ready for fabrication review.</span>
              </div>
              <div className="about-legend-item">
                <span className="about-legend-dot" style={{ background: 'var(--score-yellow)' }} />
                <span><strong style={{ color: 'var(--score-yellow)' }}>40–69</strong> — Moderate integrity. Some improvements recommended.</span>
              </div>
              <div className="about-legend-item">
                <span className="about-legend-dot" style={{ background: 'var(--score-red)' }} />
                <span><strong style={{ color: 'var(--score-red)' }}>0–39</strong> — Weak structure. Significant redesign likely needed.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
