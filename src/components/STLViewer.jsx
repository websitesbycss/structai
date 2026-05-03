import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js'
import './STLViewer.css'

const MAX_HEATMAP_FACES = 400000

function scoreToRgb(score) {
  const t = Math.max(0, Math.min(1, score))
  if (t <= 0.5) {
    const u = t * 2
    return [
      34 / 255 + (234 / 255 - 34 / 255) * u,
      197 / 255 + (179 / 255 - 197 / 255) * u,
      94 / 255 + (8 / 255 - 94 / 255) * u,
    ]
  }
  const u = (t - 0.5) * 2
  return [
    234 / 255 + (239 / 255 - 234 / 255) * u,
    179 / 255 + (68 / 255 - 179 / 255) * u,
    8 / 255 + (68 / 255 - 8 / 255) * u,
  ]
}

function applyHeatmap(geo, scores, heatmapMatRef) {
  const n = scores.length
  const colors = new Float32Array(n * 9)
  for (let fi = 0; fi < n; fi++) {
    const [r, g, b] = scoreToRgb(scores[fi])
    for (let v = 0; v < 3; v++) {
      const i = (fi * 3 + v) * 3
      colors[i] = r; colors[i + 1] = g; colors[i + 2] = b
    }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  heatmapMatRef.current = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 25,
    side: THREE.DoubleSide,
  })
}

function computeClientHeatmap(geometry) {
  const pos = geometry.attributes.position
  const faceCount = pos.count / 3
  if (faceCount > MAX_HEATMAP_FACES) return null

  const scores = new Float32Array(faceCount)

  // Pass 1 — face normals and areas
  const faceNx = new Float32Array(faceCount)
  const faceNy = new Float32Array(faceCount)
  const faceNz = new Float32Array(faceCount)
  const areas  = new Float32Array(faceCount)
  let totalArea = 0

  for (let fi = 0; fi < faceCount; fi++) {
    const i0 = fi * 3, i1 = i0 + 1, i2 = i0 + 2
    const x0 = pos.getX(i0), y0 = pos.getY(i0), z0 = pos.getZ(i0)
    const x1 = pos.getX(i1), y1 = pos.getY(i1), z1 = pos.getZ(i1)
    const x2 = pos.getX(i2), y2 = pos.getY(i2), z2 = pos.getZ(i2)
    const ex1 = x1 - x0, ey1 = y1 - y0, ez1 = z1 - z0
    const ex2 = x2 - x0, ey2 = y2 - y0, ez2 = z2 - z0
    const cx = ey1 * ez2 - ez1 * ey2
    const cy = ez1 * ex2 - ex1 * ez2
    const cz = ex1 * ey2 - ey1 * ex2
    const len = Math.sqrt(cx * cx + cy * cy + cz * cz)
    areas[fi] = len * 0.5
    totalArea += areas[fi]
    if (len > 0) { faceNx[fi] = cx / len; faceNy[fi] = cy / len; faceNz[fi] = cz / len }
  }

  // Degenerate triangles
  const meanArea = totalArea / faceCount
  for (let fi = 0; fi < faceCount; fi++) {
    if (areas[fi] < meanArea * 0.001) scores[fi] = 0.6
  }

  // Pass 2 — edge adjacency + face neighbor lists
  const QUANT = 1e4, OFFSET = 20000
  const edgeMap = new Map()
  const neighbors = new Array(faceCount)
  for (let fi = 0; fi < faceCount; fi++) neighbors[fi] = []

  for (let fi = 0; fi < faceCount; fi++) {
    const base = fi * 3
    const vk = []
    for (let v = 0; v < 3; v++) {
      const idx = base + v
      vk.push(`${Math.round(pos.getX(idx) * QUANT) + OFFSET},${Math.round(pos.getY(idx) * QUANT) + OFFSET},${Math.round(pos.getZ(idx) * QUANT) + OFFSET}`)
    }
    for (let e = 0; e < 3; e++) {
      const a = vk[e], b = vk[(e + 1) % 3]
      const ek = a < b ? `${a}|${b}` : `${b}|${a}`
      const entry = edgeMap.get(ek)
      if (!entry) edgeMap.set(ek, [fi])
      else entry.push(fi)
    }
  }

  for (const faces of edgeMap.values()) {
    if (faces.length === 2) {
      neighbors[faces[0]].push(faces[1])
      neighbors[faces[1]].push(faces[0])
    }
  }

  // Pass 3 — topology defects: boundary edges and non-manifold edges
  const defectFaces = new Set()
  for (const faces of edgeMap.values()) {
    if (faces.length === 1) {
      scores[faces[0]] = Math.max(scores[faces[0]], 1.0)
      defectFaces.add(faces[0])
    } else if (faces.length > 2) {
      for (const fi of faces) {
        scores[fi] = Math.max(scores[fi], 0.8)
        defectFaces.add(fi)
      }
    }
  }

  // Pass 4 — per-face normal vs. neighborhood average
  // Compares each face's normal to the mean of all its neighbors, catching isolated
  // flipped faces and noisy regions that pairwise comparison misses.
  for (let fi = 0; fi < faceCount; fi++) {
    const nbrs = neighbors[fi]
    if (nbrs.length === 0) continue
    let avgNx = 0, avgNy = 0, avgNz = 0
    for (const ni of nbrs) { avgNx += faceNx[ni]; avgNy += faceNy[ni]; avgNz += faceNz[ni] }
    const nlen = Math.sqrt(avgNx * avgNx + avgNy * avgNy + avgNz * avgNz)
    if (nlen < 0.01) continue
    const dot = Math.max(-1, Math.min(1,
      faceNx[fi] * (avgNx / nlen) + faceNy[fi] * (avgNy / nlen) + faceNz[fi] * (avgNz / nlen)
    ))
    if (dot < 0) {
      // angle > 90° from neighborhood average — likely flipped or severely misaligned
      const s = 0.5 + (1 - (dot + 1)) * 0.35
      scores[fi] = Math.max(scores[fi], s)
      if (dot < -0.5) defectFaces.add(fi)
    }
  }

  // Pass 5 — area irregularity: flag faces much larger or smaller than their neighbors
  // Catches poorly tessellated regions and star-shaped artifacts
  for (let fi = 0; fi < faceCount; fi++) {
    const nbrs = neighbors[fi]
    if (nbrs.length === 0) continue
    let nbMean = 0
    for (const ni of nbrs) nbMean += areas[ni]
    nbMean /= nbrs.length
    if (nbMean < 1e-12) continue
    const ratio = areas[fi] / nbMean
    const deviation = ratio < 1 ? 1 / ratio : ratio
    if (deviation > 6) {
      scores[fi] = Math.max(scores[fi], Math.min((deviation - 6) / 18, 1) * 0.45 + 0.15)
    }
  }

  // Pass 6 — BFS multi-hop propagation from defect faces with exponential falloff
  // Replaces the single-hop hard 0.4 cutoff with a smooth gradient
  if (defectFaces.size > 0) {
    const dist = new Uint8Array(faceCount).fill(255)
    const queue = new Int32Array(faceCount)
    let qHead = 0, qTail = 0
    for (const fi of defectFaces) { dist[fi] = 0; queue[qTail++] = fi }

    while (qHead < qTail) {
      const fi = queue[qHead++]
      const d = dist[fi]
      if (d >= 5) continue
      for (const ni of neighbors[fi]) {
        if (dist[ni] === 255) { dist[ni] = d + 1; queue[qTail++] = ni }
      }
    }

    for (let fi = 0; fi < faceCount; fi++) {
      const d = dist[fi]
      if (d === 0 || d === 255) continue
      // 0.45 → 0.25 → 0.14 → 0.08 → 0.04 across 5 hops
      scores[fi] = Math.max(scores[fi], 0.45 * Math.pow(0.55, d - 1))
    }
  }

  // Pass 7 — subtle curvature tint on healthy faces so the mesh isn't flat green
  // Uses max normal deviation to any neighbor, capped at 0.18 so it never looks like a defect
  for (let fi = 0; fi < faceCount; fi++) {
    if (scores[fi] >= 0.18) continue
    const nbrs = neighbors[fi]
    let maxDev = 0
    for (const ni of nbrs) {
      const d = 1 - Math.max(-1, Math.min(1,
        faceNx[fi] * faceNx[ni] + faceNy[fi] * faceNy[ni] + faceNz[fi] * faceNz[ni]
      ))
      if (d > maxDev) maxDev = d
    }
    // 1-cos maps 0°→0, 90°→1, 45°→0.29 — scale to 0-0.18 range
    scores[fi] = Math.min(maxDev, 1) * 0.18
  }

  return scores
}

export default function STLViewer({ file, heatmapMode, onHeatmapReady }) {
  const containerRef  = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const meshRef       = useRef(null)
  const normalMatRef  = useRef(null)
  const heatmapMatRef = useRef(null)
  const geometryRef   = useRef(null)

  // ── Effect 1: build scene when file changes ─────────────────────────────
  useEffect(() => {
    if (!file || !containerRef.current) return
    const container = containerRef.current

    setLoading(true)
    setError(null)
    meshRef.current       = null
    geometryRef.current   = null
    normalMatRef.current  = null
    heatmapMatRef.current = null
    onHeatmapReady?.(false)

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 10000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.55))
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.9)
    keyLight.position.set(1, 2, 3)
    scene.add(keyLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35)
    fillLight.position.set(-2, -1, -2)
    scene.add(fillLight)

    const controls = new TrackballControls(camera, renderer.domElement)
    controls.rotateSpeed = 2.5
    controls.zoomSpeed   = 1.2
    controls.panSpeed    = 0.8
    controls.staticMoving = false
    controls.dynamicDampingFactor = 0.15
    controls.minDistance = 0.5
    controls.maxDistance = 5000

    const loader = new STLLoader()
    const reader = new FileReader()
    let heatmapTimer = null

    reader.onload = (e) => {
      try {
        const geometry = loader.parse(e.target.result)
        geometry.computeBoundingBox()
        geometry.center()

        const bbox = new THREE.Box3().setFromBufferAttribute(geometry.attributes.position)
        const size = new THREE.Vector3()
        bbox.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        geometry.scale(3 / maxDim, 3 / maxDim, 3 / maxDim)

        geometryRef.current = geometry

        normalMatRef.current = new THREE.MeshPhongMaterial({
          color: 0xd4d4d4, specular: 0x333333, shininess: 50, side: THREE.DoubleSide,
        })

        const mesh = new THREE.Mesh(geometry, normalMatRef.current)
        meshRef.current = mesh
        scene.add(mesh)

        const distance = 3 * 2.2
        camera.position.set(distance * 0.6, distance * 0.4, distance)
        camera.lookAt(0, 0, 0)
        controls.target.set(0, 0, 0)
        controls.update(0)

        setLoading(false)

        // Compute heatmap after the first frame renders
        heatmapTimer = setTimeout(() => {
          const scores = computeClientHeatmap(geometry)
          if (scores) {
            applyHeatmap(geometry, scores, heatmapMatRef)
            onHeatmapReady?.(true)
          }
        }, 50)
      } catch {
        setError('Failed to parse STL file.')
        setLoading(false)
      }
    }

    reader.onerror = () => { setError('Failed to read file.'); setLoading(false) }
    reader.readAsArrayBuffer(file)

    const clock = new THREE.Clock()
    let animId
    function animate() {
      animId = requestAnimationFrame(animate)
      controls.update(clock.getDelta())
      renderer.render(scene, camera)
    }
    animate()

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth, h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    ro.observe(container)

    return () => {
      clearTimeout(heatmapTimer)
      cancelAnimationFrame(animId)
      ro.disconnect()
      controls.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [file])

  // ── Effect 2: swap material when heatmap mode is toggled ────────────────
  useEffect(() => {
    const m = meshRef.current
    if (!m) return
    if (heatmapMode && heatmapMatRef.current) {
      m.material = heatmapMatRef.current
    } else if (normalMatRef.current) {
      m.material = normalMatRef.current
    }
  }, [heatmapMode])

  return (
    <div className="stl-viewer" ref={containerRef}>
      {loading && !error && (
        <div className="stl-overlay">
          <div className="stl-spinner" />
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
