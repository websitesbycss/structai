import { useState, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import STLViewer from '../components/STLViewer'
import './Upload.css'

const SCREEN = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
}

const API_URL = import.meta.env.VITE_API_URL

export default function Upload() {
  const [screen, setScreen] = useState(SCREEN.UPLOAD)
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [apiError, setApiError] = useState(null)
  const fileInputRef = useRef(null)

  async function handleFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.stl')) {
      alert('Please upload an .stl file.')
      return
    }

    setFile(f)
    setResult(null)
    setApiError(null)
    setScreen(SCREEN.ANALYZING)

    const MIN_DISPLAY_MS = 1500
    const start = Date.now()

    try {
      const formData = new FormData()
      formData.append('file', f)

      const res = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error ?? 'Analysis failed.')
      } else {
        setResult(data)
      }
    } catch (err) {
      setApiError('Could not reach the analysis server.')
    }

    const elapsed = Date.now() - start
    if (elapsed < MIN_DISPLAY_MS) {
      await new Promise(r => setTimeout(r, MIN_DISPLAY_MS - elapsed))
    }

    setScreen(SCREEN.RESULTS)
  }

  function handleInputChange(e) { handleFile(e.target.files[0]) }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  function handleNewFile() {
    setScreen(SCREEN.UPLOAD)
    setFile(null)
    setResult(null)
    setApiError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Analyzing ─────────────────────────────────────────────────────────────
  if (screen === SCREEN.ANALYZING) {
    return (
      <div className="upload-page">
        <Navbar />
        <div className="upload-body">
          <div className="analyzing-wrap">
            <div className="spinner" />
            <p className="analyzing-text">Analyzing File…</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Results ───────────────────────────────────────────────────────────────
  if (screen === SCREEN.RESULTS) {
    return (
      <div className="upload-page">
        <Navbar />
        <div className="results-layout">
          <aside className="results-sidebar">
            <div className="results-sidebar-header">File Viewer</div>
            <div className="results-sidebar-body">
              {apiError ? (
                <div className="results-error">
                  <p className="results-error-title">Analysis failed</p>
                  <p className="results-error-msg">{apiError}</p>
                </div>
              ) : result ? (
                <MeshStats result={result} />
              ) : null}
            </div>
            <button className="results-new-file" onClick={handleNewFile}>
              <span className="results-new-file-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/>
                  <line x1="12" y1="12" x2="12" y2="21"/>
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
              </span>
              New File
            </button>
          </aside>

          <main className="results-viewer">
            <div className="results-viewer-dots" />
            <div className="results-360-hint">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>360°</span>
            </div>
            <STLViewer file={file} />
          </main>
        </div>
      </div>
    )
  }

  // ── Upload ────────────────────────────────────────────────────────────────
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
        <button
          className={`upload-dropzone ${isDragging ? 'upload-dropzone--active' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="upload-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>
          <p className="upload-label">Upload File</p>
          <p className="upload-hint">.stl files only</p>
        </button>
      </div>
    </div>
  )
}

// ── Mesh stats sidebar ─────────────────────────────────────────────────────
function MeshStats({ result }) {
  const bb = result.bounding_box

  return (
    <>
      {result.feedback && (
        <div className="results-feedback-card">
          <h3 className="results-feedback-title">Feedback</h3>
          <p className="results-feedback-text">{result.feedback}</p>
        </div>
      )}

      <ScoreDisplay score={result.score} />

      <CollapsibleSection title="Mesh">
        <StatRow label="Triangles"    value={result.triangle_count.toLocaleString()} />
        <StatRow label="Vertices"     value={result.vertex_count.toLocaleString()} />
        <StatRow label="Surface area" value={`${result.surface_area.toLocaleString()} mm²`} />
        {result.volume != null && (
          <StatRow label="Volume" value={`${result.volume.toLocaleString()} mm³`} />
        )}
        <StatRow label="Avg edge" value={`${result.avg_edge_length} mm`} />
      </CollapsibleSection>

      <CollapsibleSection title="Bounding Box">
        <StatRow label="X" value={`${bb.x} mm`} />
        <StatRow label="Y" value={`${bb.y} mm`} />
        <StatRow label="Z" value={`${bb.z} mm`} />
        {result.aspect_ratio != null && (
          <StatRow label="Aspect ratio" value={`${result.aspect_ratio}:1`} />
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Integrity">
        <StatRow
          label="Watertight"
          value={result.is_watertight ? 'Yes' : 'No'}
          valueColor={result.is_watertight ? 'var(--score-green)' : 'var(--score-red)'}
        />
        <StatRow
          label="Normals"
          value={result.is_winding_consistent ? 'Consistent' : 'Inconsistent'}
          valueColor={result.is_winding_consistent ? 'var(--score-green)' : 'var(--score-yellow)'}
        />
        <StatRow label="Euler #" value={result.euler_number} />
      </CollapsibleSection>
    </>
  )
}

function CollapsibleSection({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="stats-section">
      <button className="stats-section-header" onClick={() => setOpen(o => !o)}>
        <svg
          className={`stats-chevron ${open ? 'stats-chevron--open' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          width="12" height="12" viewBox="0 0 24 24"
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

function ScoreDisplay({ score }) {
  const color =
    score >= 0.7 ? 'var(--score-green)' :
    score >= 0.4 ? 'var(--score-yellow)' :
    'var(--score-red)'

  return (
    <div className="stats-score-box">
      <p className="stats-score-label">Structural Score</p>
      <p className="stats-score-value" style={{ color }}>
        {score.toFixed(2)}
        <span className="stats-score-denom">/1</span>
      </p>
    </div>
  )
}

function StatRow({ label, value, valueColor }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={valueColor ? { color: valueColor } : {}}>
        {value}
      </span>
    </div>
  )
}
