import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import './STLViewer.css'

export default function STLViewer({ file }) {
  const containerRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!file || !containerRef.current) return

    const container = containerRef.current
    setLoading(true)
    setError(null)

    // ── Scene ──────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // ── Camera ────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      10000
    )

    // ── Renderer (transparent so dot-grid CSS shows through) ──────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    // ── Lights ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.55))

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(1, 2, 3)
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35)
    fillLight.position.set(-2, -1, -2)
    scene.add(fillLight)

    // ── TrackballControls — fully free rotation, no axis lock ─────────────
    const controls = new TrackballControls(camera, renderer.domElement)
    controls.rotateSpeed = 2.5
    controls.zoomSpeed = 1.2
    controls.panSpeed = 0.8
    controls.staticMoving = false
    controls.dynamicDampingFactor = 0.15
    controls.minDistance = 0.5
    controls.maxDistance = 5000

    // ── Load STL ──────────────────────────────────────────────────────────
    const loader = new STLLoader()
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const geometry = loader.parse(e.target.result)

        // Center the geometry
        geometry.computeBoundingBox()
        geometry.center()

        // Scale to fill a normalized 3-unit bounding sphere
        const bbox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position)
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const targetSize = 3
        const scale = targetSize / maxDim
        geometry.scale(scale, scale, scale)

        const material = new THREE.MeshPhongMaterial({
          color: 0xd4d4d4,
          specular: 0x333333,
          shininess: 50,
          side: THREE.DoubleSide,
        })

        const mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh)

        // Position camera to frame the model
        const distance = targetSize * 2.2
        camera.position.set(distance * 0.6, distance * 0.4, distance)
        camera.lookAt(0, 0, 0)
        controls.target.set(0, 0, 0)
        controls.update(0)

        setLoading(false)
      } catch (err) {
        setError('Failed to parse STL file.')
        setLoading(false)
      }
    }

    reader.onerror = () => {
      setError('Failed to read file.')
      setLoading(false)
    }

    reader.readAsArrayBuffer(file)

    // ── Animation loop ────────────────────────────────────────────────────
    const clock = new THREE.Clock()
    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update(clock.getDelta())
      renderer.render(scene, camera)
    }
    animate()

    // ── Resize observer ───────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [file])

  return (
    <div className="stl-viewer" ref={containerRef}>
      {loading && !error && (
        <div className="stl-overlay">
          <div className="spinner" />
          <p className="stl-overlay-text">Loading model…</p>
        </div>
      )}
      {error && (
        <div className="stl-overlay">
          <p className="stl-overlay-error">{error}</p>
        </div>
      )}
    </div>
  )
}
