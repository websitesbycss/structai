import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import './Upload.css'

// Screens within the upload flow
const SCREEN = {
  UPLOAD: 'upload',
  ANALYZING: 'analyzing',
  RESULTS: 'results',
}

// Mock structural score + feedback for Phase 1 UI demo
const MOCK_RESULT = {
  score: 0.85,
  feedback: `This model demonstrates strong overall structural integrity with a watertight mesh, consistent normals, and well-distributed geometry. Minor issues such as slight variations in triangle density and a few thin regions prevent a perfect score, but the object is stable and suitable for most applications, including visualization and 3D printing with minimal adjustments.`,
}

export default function Upload() {
  const [screen, setScreen] = useState(SCREEN.UPLOAD)
  const [fileName, setFileName] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  function handleFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.stl')) {
      alert('Please upload an .stl file.')
      return
    }
    setFileName(file.name)
    setScreen(SCREEN.ANALYZING)

    // Simulate analysis delay
    setTimeout(() => {
      setScreen(SCREEN.RESULTS)
    }, 2500)
  }

  function handleInputChange(e) {
    handleFile(e.target.files[0])
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  function handleNewFile() {
    setScreen(SCREEN.UPLOAD)
    setFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const score = MOCK_RESULT.score
  const scoreColor =
    score >= 0.7 ? 'var(--score-green)' :
    score >= 0.4 ? 'var(--score-yellow)' :
    'var(--score-red)'

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

  if (screen === SCREEN.RESULTS) {
    return (
      <div className="upload-page">
        <Navbar />
        <div className="results-layout">
          {/* Left Sidebar */}
          <aside className="results-sidebar">
            <div className="results-sidebar-header">File Viewer</div>
            <div className="results-sidebar-body">
              <div className="results-feedback-card">
                <h3 className="results-feedback-title">Feedback</h3>
                <p className="results-feedback-text">{MOCK_RESULT.feedback}</p>
              </div>
              <p className="results-score">
                Structural Score:{' '}
                <span style={{ color: scoreColor }}>
                  {score.toFixed(2)}
                </span>
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

          {/* 3D Viewer Area */}
          <main className="results-viewer">
            <div className="results-viewer-dots" />
            <div className="results-360-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
              </svg>
              <span>360°</span>
            </div>

            {/* Placeholder 3D cube — replaced by Three.js in Phase 3 */}
            <div className="results-model-placeholder">
              <div className="cube-wrap">
                <div className="cube">
                  <div className="cube-face cube-front" />
                  <div className="cube-face cube-back" />
                  <div className="cube-face cube-left" />
                  <div className="cube-face cube-right" />
                  <div className="cube-face cube-top" />
                  <div className="cube-face cube-bottom" />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  // SCREEN.UPLOAD
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
