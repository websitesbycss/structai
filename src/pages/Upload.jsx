import { useState, useRef, useCallback, useEffect } from 'react'
import Navbar from '../components/Navbar'
import STLViewer from '../components/STLViewer'
import './Upload.css'

const SCREEN = { UPLOAD: 'upload', ANALYZING: 'analyzing', RESULTS: 'results' }
const API_URL = import.meta.env.VITE_API_URL

const ANALYSIS_STEPS = [
  { id: 'read',     label: 'Reading file',                detail: 'Parsing STL geometry data' },
  { id: 'geometry', label: 'Extracting geometry',         detail: 'Computing mesh properties via trimesh' },
  { id: 'ml',       label: 'Running ML model',            detail: 'Scoring structural integrity' },
  { id: 'shap',     label: 'Computing SHAP explanations', detail: 'Calculating per-feature contributions' },
  { id: 'feedback', label: 'Generating AI feedback',      detail: 'Retrieving guidelines and synthesizing recommendations' },
]

// ── Icons ──────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const UploadCloudIcon = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
)

const CubeIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
)

const FileIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
    <polyline points="13 2 13 9 20 9"/>
  </svg>
)

const MeshIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
  </svg>
)

const ScoreIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

const AIIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
)

const RotateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
  </svg>
)

const ChartIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const WrenchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
)

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const HeatmapIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M8 12a4 4 0 0 1 8 0"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
  </svg>
)

// ── Score Gauge SVG ────────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setAnimatedScore(score), 80)
    return () => clearTimeout(t)
  }, [score])

  const R = 82
  const cx = 100
  const cy = 104
  const arcLen = Math.PI * R
  const filled = arcLen * animatedScore
  const gap    = arcLen

  const color  = score >= 0.7 ? 'var(--score-green)' : score >= 0.4 ? 'var(--score-yellow)' : 'var(--score-red)'
  const glow   = score >= 0.7 ? '#22c55e' : score >= 0.4 ? '#eab308' : '#ef4444'
  const label  = score >= 0.7 ? 'Strong Integrity' : score >= 0.4 ? 'Moderate Integrity' : 'Weak Integrity'
  const desc   = score >= 0.7
    ? 'Meets structural standards. Ready for fabrication review.'
    : score >= 0.4
    ? 'Some weaknesses detected. Review feedback for improvements.'
    : 'Significant issues found. Redesign may be required.'

  const scoreDisplay = Math.round(animatedScore * 100)

  return (
    <div className="gauge-wrap">
      <svg
        viewBox="0 0 200 136"
        className="gauge-svg"
        aria-label={`Structural integrity score: ${scoreDisplay} out of 100`}
        role="img"
      >
        <defs>
          <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="track-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
          </filter>
        </defs>

        <path
          d={`M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`}
          fill="none" stroke="#1e2430" strokeWidth="13" strokeLinecap="round"
          filter="url(#track-shadow)"
        />
        <path
          d={`M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`}
          fill="none" stroke={glow} strokeWidth="18" strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`} opacity="0.18"
          style={{ transition: `stroke-dasharray 1.5s cubic-bezier(0.34,1.2,0.64,1)` }}
        />
        <path
          d={`M ${cx - R},${cy} A ${R},${R} 0 0,1 ${cx + R},${cy}`}
          fill="none" stroke={glow} strokeWidth="11" strokeLinecap="round"
          strokeDasharray={`${filled} ${gap}`} filter="url(#gauge-glow)"
          style={{ transition: `stroke-dasharray 1.5s cubic-bezier(0.34,1.2,0.64,1)` }}
        />

        <text x={cx} y={cy - 22} textAnchor="middle" fill="#f0f4ff"
          fontSize="38" fontWeight="800" fontFamily="'Fira Code', monospace" letterSpacing="-1">
          {scoreDisplay}
        </text>
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#3e4a63"
          fontSize="11" fontFamily="inherit" fontWeight="600" letterSpacing="1">
          / 100
        </text>
        <text x={cx - R + 1} y={cy + 15} fill="#3e4a63" fontSize="9" textAnchor="middle" fontFamily="inherit">0</text>
        <text x={cx + R - 1} y={cy + 15} fill="#3e4a63" fontSize="9" textAnchor="middle" fontFamily="inherit">100</text>
      </svg>

      <div className="gauge-label" style={{ color }}>{label}</div>
      <p className="gauge-desc">{desc}</p>

      <div className="gauge-bands">
        <div className={`gauge-band gauge-band--red ${score < 0.4 ? 'gauge-band--active' : ''}`}>
          <span className="gauge-band-dot" /><span>0–39 Weak</span>
        </div>
        <div className={`gauge-band gauge-band--yellow ${score >= 0.4 && score < 0.7 ? 'gauge-band--active' : ''}`}>
          <span className="gauge-band-dot" /><span>40–69 Moderate</span>
        </div>
        <div className={`gauge-band gauge-band--green ${score >= 0.7 ? 'gauge-band--active' : ''}`}>
          <span className="gauge-band-dot" /><span>70–100 Strong</span>
        </div>
      </div>
    </div>
  )
}

// ── SHAP chart ─────────────────────────────────────────────────────────────
const FEATURE_LABELS = {
  sphericity:            'Sphericity',
  is_watertight:         'Watertight',
  aspect_ratio:          'Aspect Ratio',
  volume:                'Volume',
  euler_number:          'Euler Number',
  is_winding_consistent: 'Normal Consistency',
  triangle_count:        'Triangle Count',
  avg_edge_length:       'Avg Edge Length',
  surface_area:          'Surface Area',
  sa_v_ratio:            'SA/V Ratio',
  vertex_count:          'Vertex Count',
}

function ShapChart({ shapValues }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const entries = Object.entries(shapValues)
    .map(([feat, val]) => ({ feat, val }))
    .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
    .slice(0, 8)

  const maxAbs = Math.max(...entries.map(e => Math.abs(e.val)), 0.0001)

  return (
    <div className="shap-chart">
      {entries.map(({ feat, val }) => {
        const pct   = (Math.abs(val) / maxAbs) * 100
        const isPos = val >= 0
        return (
          <div key={feat} className="shap-row">
            <span className="shap-label">{FEATURE_LABELS[feat] ?? feat}</span>
            <div className="shap-bar-track">
              <div
                className={`shap-bar ${isPos ? 'shap-bar--pos' : 'shap-bar--neg'}`}
                style={{ width: ready ? `${pct}%` : '0%' }}
              />
            </div>
            <span className={`shap-val ${isPos ? 'shap-val--pos' : 'shap-val--neg'}`}>
              {isPos ? '+' : ''}{val.toFixed(3)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Repair results ─────────────────────────────────────────────────────────
function RepairResults({ result, originalFileName }) {
  function downloadStl() {
    const bytes    = Uint8Array.from(atob(result.repaired_stl_b64), c => c.charCodeAt(0))
    const blob     = new Blob([bytes], { type: 'application/octet-stream' })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href         = url
    const base     = originalFileName ? originalFileName.replace(/\.stl$/i, '') : 'mesh'
    a.download     = `${base}_repaired.stl`
    a.click()
    URL.revokeObjectURL(url)
  }

  const scoreDiff  = result.repaired_score - result.original_score
  const isImproved = scoreDiff > 0.005
  const isWorse    = scoreDiff < -0.005
  const noChanges  = result.repairs_applied.length === 1 &&
    result.repairs_applied[0].toLowerCase().includes('no significant issues')

  return (
    <div className="repair-results">
      <div className="repair-score-row">
        <div className="repair-score-item">
          <span className="repair-score-label">Before</span>
          <span className="repair-score-val repair-score-val--before">
            {Math.round(result.original_score * 100)}
          </span>
        </div>
        <span className="repair-arrow">→</span>
        <div className="repair-score-item">
          <span className="repair-score-label">After</span>
          <span className={`repair-score-val ${isImproved ? 'repair-score-val--improved' : isWorse ? 'repair-score-val--worse' : 'repair-score-val--same'}`}>
            {Math.round(result.repaired_score * 100)}
          </span>
        </div>
        {isImproved && (
          <span className="repair-delta repair-delta--pos">+{Math.round(scoreDiff * 100)} pts</span>
        )}
        {isWorse && (
          <span className="repair-delta repair-delta--neg">{Math.round(scoreDiff * 100)} pts</span>
        )}
      </div>

      {result.repair_summary && (
        <p className="repair-summary">{result.repair_summary}</p>
      )}

      <div className="repair-log">
        {result.repairs_applied.map((r, i) => (
          <div key={i} className="repair-log-item">
            <CheckIcon />
            <span>{r}</span>
          </div>
        ))}
      </div>

      {!noChanges && (
        <button className="repair-download" onClick={downloadStl}>
          <DownloadIcon />
          Download Repaired STL
        </button>
      )}
    </div>
  )
}

// ── Analysis panel (right) ─────────────────────────────────────────────────
function AnalysisPanel({ result, repairState, repairResult, repairError, onRepair, fileName }) {
  return (
    <aside className="results-analysis">
      {/* Score */}
      <div className="analysis-block">
        <div className="analysis-block-header">
          <ScoreIcon />
          Structural Score
        </div>
        <ScoreGauge score={result.score} />
      </div>

      {/* SHAP Score Breakdown */}
      {result.shap_values && (
        <div className="analysis-block">
          <div className="analysis-block-header">
            <ChartIcon />
            Score Breakdown
          </div>
          <p className="shap-subtitle">Feature contributions to this score</p>
          <ShapChart shapValues={result.shap_values} />
        </div>
      )}

      {/* AI Feedback (RAG-enhanced) */}
      {result.feedback && (
        <div className="analysis-block analysis-block--feedback">
          <div className="analysis-block-header">
            <AIIcon />
            AI Feedback
          </div>
          <div className="feedback-body">
            <div className="feedback-ai-badge">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Generated by AI
            </div>
            <p className="feedback-text">{result.feedback}</p>
          </div>
        </div>
      )}

      {/* Mesh Repair Agent (demo) */}
      <div className="analysis-block repair-demo">
        <div className="analysis-block-header">
          <WrenchIcon />
          Mesh Repair Agent
          <span className="demo-badge">Demo</span>
        </div>

        {repairState === 'idle' && (
          <>
            <p className="repair-desc">
              An AI agent applies targeted fixes (winding correction, hole filling, and removal
              of degenerate faces) then re-scores your mesh.
            </p>
            <button className="repair-btn" onClick={onRepair}>
              Run Repair
            </button>
          </>
        )}

        {repairState === 'loading' && (
          <div className="repair-loading">
            <div className="spinner-sm" />
            <span>Agent is repairing mesh…</span>
          </div>
        )}

        {repairState === 'done' && repairResult && (
          <RepairResults result={repairResult} originalFileName={fileName} />
        )}

        {repairState === 'error' && (
          <p className="repair-error">{repairError ?? 'Repair failed. Please try again.'}</p>
        )}
      </div>
    </aside>
  )
}

// ── Mesh stats sidebar (left) ──────────────────────────────────────────────
function MeshStats({ result }) {
  const bb = result.bounding_box
  return (
    <>
      <CollapsibleSection title="Mesh" defaultOpen>
        <StatRow label="Triangles"          value={result.triangle_count.toLocaleString()} />
        <StatRow label="Vertices"           value={result.vertex_count.toLocaleString()} />
        <StatRow label="Surface area"       value={`${result.surface_area.toLocaleString(undefined, { maximumFractionDigits: 2 })} mm²`} />
        {result.volume != null && (
          <StatRow label="Volume"           value={`${result.volume.toLocaleString(undefined, { maximumFractionDigits: 2 })} mm³`} />
        )}
        <StatRow label="Average Edge Length" value={`${result.avg_edge_length.toFixed(2)} mm`} />
      </CollapsibleSection>

      <CollapsibleSection title="Bounding Box" defaultOpen>
        <StatRow label="X" value={`${bb.x.toFixed(2)} mm`} />
        <StatRow label="Y" value={`${bb.y.toFixed(2)} mm`} />
        <StatRow label="Z" value={`${bb.z.toFixed(2)} mm`} />
        {result.aspect_ratio != null && (
          <StatRow label="Aspect ratio" value={`${result.aspect_ratio.toFixed(2)}:1`} />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Integrity" defaultOpen>
        <StatRow
          label="Watertight"
          value={result.is_watertight ? 'Yes' : 'No'}
          badge={result.is_watertight ? 'pass' : 'fail'}
        />
        <StatRow
          label="Normals"
          value={result.is_winding_consistent ? 'Consistent' : 'Inconsistent'}
          badge={result.is_winding_consistent ? 'pass' : 'warn'}
        />
        <StatRow label="Euler #" value={result.euler_number} />
      </CollapsibleSection>
    </>
  )
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="stats-section">
      <button
        className="stats-section-header"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <svg
          className={`stats-chevron ${open ? 'stats-chevron--open' : ''}`}
          width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {title}
      </button>
      {open && <div className="stats-section-body">{children}</div>}
    </div>
  )
}

function StatRow({ label, value, badge }) {
  const badgeColor = badge === 'pass' ? 'var(--score-green)' : badge === 'warn' ? 'var(--score-yellow)' : badge === 'fail' ? 'var(--score-red)' : null
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={badgeColor ? { color: badgeColor } : {}}>
        {value}
      </span>
    </div>
  )
}

// ── Main Upload component ──────────────────────────────────────────────────
export default function Upload() {
  const [screen,      setScreen]      = useState(SCREEN.UPLOAD)
  const [file,        setFile]        = useState(null)
  const [isDragging,  setIsDragging]  = useState(false)
  const [result,      setResult]      = useState(null)
  const [apiError,    setApiError]    = useState(null)
  const [analysisStep, setAnalysisStep] = useState(0)
  const [heatmapMode, setHeatmapMode] = useState(false)
  const [hasHeatmap,  setHasHeatmap]  = useState(false)
  const [repairState, setRepairState] = useState('idle')  // idle|loading|done|error
  const [repairResult, setRepairResult] = useState(null)
  const [repairError, setRepairError] = useState(null)
  const fileInputRef  = useRef(null)
  const stepTimersRef = useRef([])

  function clearStepTimers() {
    stepTimersRef.current.forEach(clearTimeout)
    stepTimersRef.current = []
  }

  async function handleFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.stl')) {
      alert('Please upload an .stl file.')
      return
    }

    setFile(f)
    setResult(null)
    setApiError(null)
    setAnalysisStep(0)
    setHeatmapMode(false)
    setHasHeatmap(false)
    setRepairState('idle')
    setRepairResult(null)
    setScreen(SCREEN.ANALYZING)

    clearStepTimers()
    const delays = [0, 700, 1500, 2200, 2900]
    delays.forEach((delay, i) => {
      const t = setTimeout(() => setAnalysisStep(i), delay)
      stepTimersRef.current.push(t)
    })

    const MIN_DISPLAY_MS = 3400
    const start = Date.now()

    try {
      const formData = new FormData()
      formData.append('file', f)
      const res  = await fetch(`${API_URL}/analyze`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setApiError(data.error ?? 'Analysis failed.')
      } else {
        setResult(data)
      }
    } catch {
      setApiError('Could not reach the analysis server.')
    }

    const elapsed = Date.now() - start
    if (elapsed < MIN_DISPLAY_MS) {
      await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed))
    }

    setAnalysisStep(ANALYSIS_STEPS.length)
    await new Promise(r => setTimeout(r, 350))
    setScreen(SCREEN.RESULTS)
  }

  async function handleRepair() {
    if (!file) return
    setRepairState('loading')
    setRepairResult(null)
    setRepairError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res  = await fetch(`${API_URL}/repair`, { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setRepairError(data.error ?? 'Repair failed.')
        setRepairState('error')
      } else {
        setRepairResult(data)
        setRepairState('done')
      }
    } catch {
      setRepairError('Could not reach the repair server.')
      setRepairState('error')
    }
  }

  function handleInputChange(e) { handleFile(e.target.files[0]) }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver  = useCallback((e) => { e.preventDefault(); setIsDragging(true) }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  function handleNewFile() {
    clearStepTimers()
    setScreen(SCREEN.UPLOAD)
    setFile(null)
    setResult(null)
    setApiError(null)
    setHeatmapMode(false)
    setHasHeatmap(false)
    setRepairState('idle')
    setRepairResult(null)
    setRepairError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Analyzing screen ───────────────────────────────────────────────────
  if (screen === SCREEN.ANALYZING) {
    return (
      <div className="upload-page">
        <Navbar />
        <div className="upload-body analyzing-body">
          <div className="analyzing-card">
            <div className="analyzing-icon-wrap">
              <CubeIcon />
              <div className="analyzing-icon-ring" />
            </div>

            <div className="analyzing-meta">
              <h2 className="analyzing-title">Analyzing Model</h2>
              <p className="analyzing-filename">
                <FileIcon />
                {file?.name}
              </p>
            </div>

            <div className="analyzing-steps">
              {ANALYSIS_STEPS.map((step, i) => {
                const isDone    = i < analysisStep
                const isActive  = i === analysisStep
                const isPending = i > analysisStep
                return (
                  <div
                    key={step.id}
                    className={`astep ${isDone ? 'astep--done' : isActive ? 'astep--active' : 'astep--pending'}`}
                  >
                    <div className="astep-indicator">
                      {isDone
                        ? <CheckIcon />
                        : isActive
                        ? <div className="astep-pulse" />
                        : <div className="astep-dot" />
                      }
                    </div>
                    <div className="astep-text">
                      <span className="astep-label">{step.label}</span>
                      {isActive && <span className="astep-detail">{step.detail}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="analyzing-progress-track">
              <div
                className="analyzing-progress-fill"
                style={{ width: `${(analysisStep / ANALYSIS_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Results screen ─────────────────────────────────────────────────────
  if (screen === SCREEN.RESULTS) {
    return (
      <div className="upload-page">
        <Navbar />
        <div className="results-layout">

          {/* ── Left: Mesh stats ── */}
          <aside className="results-sidebar">
            <div className="results-sidebar-header">
              <MeshIcon />
              Mesh Properties
            </div>
            <div className="results-sidebar-body">
              {apiError ? (
                <div className="results-error">
                  <div className="results-error-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <p className="results-error-title">Analysis failed</p>
                  <p className="results-error-msg">{apiError}</p>
                </div>
              ) : result ? (
                <MeshStats result={result} />
              ) : null}
            </div>
            <button className="results-new-file" onClick={handleNewFile}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Analyze New File
            </button>
          </aside>

          {/* ── Center: 3D Viewer ── */}
          <main className="results-viewer">
            <div className="results-viewer-bg" />
            <div className="results-viewer-topbar">
              <div className="results-viewer-filename">
                <FileIcon />
                <span>{file?.name}</span>
              </div>
              {result && (
                <div
                  className="results-viewer-score-chip"
                  style={{
                    color: result.score >= 0.7 ? 'var(--score-green)' : result.score >= 0.4 ? 'var(--score-yellow)' : 'var(--score-red)',
                    borderColor: result.score >= 0.7 ? 'rgba(34,197,94,0.3)' : result.score >= 0.4 ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)',
                    background: result.score >= 0.7 ? 'rgba(34,197,94,0.07)' : result.score >= 0.4 ? 'rgba(234,179,8,0.07)' : 'rgba(239,68,68,0.07)',
                  }}
                >
                  Score: {Math.round(result.score * 100)}/100
                </div>
              )}
            </div>

            {/* Heatmap toggle */}
            {hasHeatmap && (
              <button
                className={`heatmap-toggle ${heatmapMode ? 'heatmap-toggle--active' : ''}`}
                onClick={() => setHeatmapMode(m => !m)}
                title="Toggle defect heatmap visualization"
              >
                <HeatmapIcon />
                Defect Heatmap
                <span className="beta-badge">Beta</span>
              </button>
            )}

            {/* Heatmap legend */}
            {heatmapMode && hasHeatmap && (
              <div className="heatmap-legend">
                <span className="heatmap-legend-item heatmap-legend-item--good">Good</span>
                <span className="heatmap-legend-item heatmap-legend-item--warn">Caution</span>
                <span className="heatmap-legend-item heatmap-legend-item--bad">Defect</span>
              </div>
            )}

            <div className="results-360-badge" aria-hidden="true">
              <RotateIcon />
              <span>Drag to<br/>rotate</span>
            </div>

            <STLViewer
              file={file}
              heatmapMode={heatmapMode}
              onHeatmapReady={setHasHeatmap}
            />
          </main>

          {/* ── Right: Score + SHAP + Feedback + Repair ── */}
          {result && (
            <AnalysisPanel
              result={result}
              repairState={repairState}
              repairResult={repairResult}
              repairError={repairError}
              onRepair={handleRepair}
              fileName={file?.name}
            />
          )}
        </div>
      </div>
    )
  }

  // ── Upload screen ──────────────────────────────────────────────────────
  return (
    <div className="upload-page">
      <Navbar />
      <div className="upload-body">
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        <div className="upload-container">
          <div className="upload-header">
            <h1 className="upload-title">Upload Your Model</h1>
            <p className="upload-subtitle">
              Drop an <span className="upload-subtitle-accent">.stl</span> file to get a full
              structural integrity analysis powered by ML and AI feedback.
            </p>
          </div>

          <button
            className={`upload-dropzone ${isDragging ? 'upload-dropzone--active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            aria-label="Upload STL file — click or drag and drop"
          >
            <div className="upload-dropzone-border" aria-hidden="true" />
            <div className="upload-dropzone-inner">
              <div className="upload-icon-wrap">
                <UploadCloudIcon />
                <div className="upload-icon-glow" />
              </div>
              <p className="upload-label">
                {isDragging ? 'Release to upload' : 'Drop your file here'}
              </p>
              <p className="upload-hint">or click to browse your files</p>
              <div className="upload-format-badges">
                <span className="upload-badge upload-badge--primary">STL only</span>
              </div>
            </div>
          </button>

          <p className="upload-footer">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Your file is processed server-side and never stored permanently.
          </p>
        </div>
      </div>
    </div>
  )
}
