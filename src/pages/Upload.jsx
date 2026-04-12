import { useState, useRef, useCallback } from 'react'
import Navbar from '../components/Navbar'
import STLViewer from '../components/STLViewer'
import './Upload.css'

const SCREEN = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
}

// Mock result — replaced by real backend in Phase 4+
const MOCK_RESULT = {
  score: 0.85,
  feedback: `This model demonstrates strong overall structural integrity with a watertight mesh, consistent normals, and well-distributed geometry. Minor issues such as slight variations in triangle density and a few thin regions prevent a perfect score, but the object is stable and suitable for most applications, including visualization and 3D printing with minimal adjustments.`,
}

export default function Upload() {
  const [screen, setScreen] = useState(SCREEN.UPLOAD)
  const [file, setFile] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  function handleFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.stl')) {
      alert('Please upload an .stl file.')
      return
    }
    setFile(f)
    setScreen(SCREEN.ANALYZING)
    setTimeout(() => setScreen(SCREEN.RESULTS), 2500)
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
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const score = MOCK_RESULT.score
  const scoreColor =
    score >= 0.7 ? 'var(--score-green)' :
    score >= 0.4 ? 'var(--score-yellow)' :
    'var(--score-red)'

  // ── Analyzing ────────────────────────────────────────────────────────────
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
              <div className="results-feedback-card">
                <h3 className="results-feedback-title">Feedback</h3>
                <p className="results-feedback-text">{MOCK_RESULT.feedback}</p>
              </div>
              <p className="results-score">
                Structural Score:{' '}
                <span style={{ color: scoreColor }}>{score.toFixed(2)}</span>
                <span className="results-score-denom">/1</span>
              </p>
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
