import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import Navbar from '../components/Navbar'
import heroBg from '../assets/hero.png'
import './Home.css'
import './About.css'

// ── Wireframe mesh SVG (hero mock) ────────────────────────────────────────
function WireframeMesh() {
  const edge      = '#22d3ee'
  const edgeFaint = 'rgba(34,211,238,0.4)'
  const faceFill  = 'rgba(34,211,238,0.05)'

  return (
    <svg className="home-mock-mesh" viewBox="0 0 200 215" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <polygon points="30,82 120,82 160,42 70,42"    stroke={edge} strokeWidth="0.9" fill={faceFill} />
      <polygon points="120,82 160,42 160,132 120,172" stroke={edge} strokeWidth="0.9" fill={faceFill} />
      <polygon points="30,82 120,82 120,172 30,172"   stroke={edge} strokeWidth="0.9" fill="rgba(34,211,238,0.07)" />
      <line x1="30"  y1="112" x2="120" y2="112" stroke={edgeFaint} strokeWidth="0.5" />
      <line x1="30"  y1="142" x2="120" y2="142" stroke={edgeFaint} strokeWidth="0.5" />
      <line x1="60"  y1="82"  x2="60"  y2="172" stroke={edgeFaint} strokeWidth="0.5" />
      <line x1="90"  y1="82"  x2="90"  y2="172" stroke={edgeFaint} strokeWidth="0.5" />
      <line x1="120" y1="107" x2="160" y2="87"  stroke={edgeFaint} strokeWidth="0.5" />
      <line x1="140" y1="62"  x2="140" y2="152" stroke={edgeFaint} strokeWidth="0.4" />
      <line x1="30"  y1="82"  x2="160" y2="42"  stroke={edgeFaint} strokeWidth="0.4" strokeDasharray="4 3" />
      {[[30,82],[120,82],[120,172],[30,172],[70,42],[160,42],[160,132]].map(([cx,cy]) => (
        <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="2.5" fill={edge} />
      ))}
    </svg>
  )
}

// ── Step flow ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    label: 'Upload',
    desc:  'Drag & drop your .stl file into the browser',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 16 12 12 8 16"/>
        <line x1="12" y1="12" x2="12" y2="21"/>
        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
      </svg>
    ),
  },
  {
    label: 'Analyze',
    desc:  'ML model scores structural integrity metrics',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M3 18V12M7 18V8M11 18V4M15 18V10M19 18V14"/>
      </svg>
    ),
  },
  {
    label: 'Results',
    desc:  'Get a full AI report with actionable feedback',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
]

const ARROW = (
  <svg viewBox="0 0 80 20" fill="none" aria-hidden="true">
    <path d="M2 10 Q40 2 78 10" stroke="currentColor" strokeWidth="1.2" strokeDasharray="5 3"/>
    <polygon points="72,6 78,10 72,14" fill="currentColor"/>
  </svg>
)

const MOCK_METRICS = [
  ['Volume',            '42.3 cm³'],
  ['Surface Area',      '118.6 cm²'],
  ['Triangles',         '14,892'],
  ['Normal Consistency','99.8%'],
  ['Watertight',        'Yes'],
]

// ── About section card icons (SVG — no emojis) ────────────────────────────
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

// ── Page component ─────────────────────────────────────────────────────────
export default function Home() {
  const navigate    = useNavigate()
  const { isSignedIn } = useUser()

  useEffect(() => {
    if (window.location.hash === '#about') {
      const el = document.getElementById('about')
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [])

  function handleGetStarted() {
    navigate(isSignedIn ? '/upload' : '/auth')
  }

  return (
    <div className="home">
      <Navbar />

      {/* ── Hero ── */}
      <section className="home-hero">
        <div className="home-hero-bg" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="home-hero-glow" aria-hidden="true" />
        <div className="home-hero-content">
          <div className="home-hero-eyebrow">Structural Analysis · Powered by ML</div>
          <h1 className="home-headline">
            Analyze Your<br />Models in Seconds
          </h1>
          <p className="home-sub">
            Upload any STL file and get an instant structural integrity score,
            geometric feature extraction, and AI-generated improvement feedback.
          </p>
          <div className="home-cta-row">
            <button className="home-cta home-cta--primary" onClick={handleGetStarted}>
              Get Started
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
            <a href="#about" className="home-cta home-cta--ghost" onClick={(e) => { e.preventDefault(); document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }) }}>
              Learn more
            </a>
          </div>
        </div>
      </section>

      {/* ── Preview ── */}
      <section className="home-preview">
        <div className="home-preview-inner">
          <p className="home-preview-eyebrow">See it in action</p>
          <h2 className="home-preview-title">Upload. Analyze. Improve.</h2>
          <p className="home-preview-sub">
            Drop in any .stl file and get a complete structural report in seconds.
          </p>

          <div className="home-steps">
            {STEPS.map((step, i) => (
              <div className="home-step-group" key={step.label}>
                <div className="home-step">
                  <div className="home-step-icon">{step.icon}</div>
                  <h3 className="home-step-label">{step.label}</h3>
                  <p className="home-step-desc">{step.desc}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="home-step-connector" aria-hidden="true">{ARROW}</div>
                )}
              </div>
            ))}
          </div>

          {/* Mock dashboard */}
          <div className="home-mock-card">
            <div className="home-mock-viewer">
              <WireframeMesh />
              <span className="home-mock-viewer-label">Interactive 3D Viewer</span>
            </div>

            <div className="home-mock-results">
              <div className="home-mock-header">
                <span className="home-mock-filename">bracket_v3.stl</span>
                <span className="home-mock-badge">Analysis Complete</span>
              </div>

              <div className="home-mock-score-row">
                <span className="home-mock-score-label">Integrity Score</span>
                <div className="home-mock-score-bar-wrap">
                  <div className="home-mock-score-bar" style={{ '--score-pct': '87%' }} />
                </div>
                <span className="home-mock-score-value">87/100</span>
              </div>

              <div className="home-mock-metrics">
                {MOCK_METRICS.map(([label, value]) => (
                  <div className="home-mock-metric" key={label}>
                    <span className="home-mock-metric-label">{label}</span>
                    <span className="home-mock-metric-value">{value}</span>
                  </div>
                ))}
              </div>

              <div className="home-mock-ai-feedback">
                <span className="home-mock-ai-tag">
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  AI Feedback
                </span>
                <p>
                  Strong structural integrity. Wall thickness is consistent and load-bearing
                  geometry is well-distributed. Consider a fillet near the bottom edge for
                  improved stress distribution under axial load.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section className="home-about" id="about">
        <div className="about-container">
          <h2 className="home-about-title">About StructAI</h2>
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
                3D mesh analysis. We extract key metrics — volume, surface area, triangle count,
                normal consistency, and more — and feed them into a custom machine learning model.
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
                feedback about your design — highlighting specific strengths, weaknesses, and
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
      </section>
    </div>
  )
}
