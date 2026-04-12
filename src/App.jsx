import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser, AuthenticateWithRedirectCallback } from '@clerk/clerk-react'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Upload from './pages/Upload'
import About from './pages/About'

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/auth" replace />
  return children
}

function RedirectIfAuthed({ children }) {
  const { isSignedIn, isLoaded } = useUser()
  if (!isLoaded) return null
  if (isSignedIn) return <Navigate to="/upload" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route
          path="/auth"
          element={
            <RedirectIfAuthed>
              <Auth />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        {/* OAuth callback route — Clerk redirects here after Google sign-in */}
        <Route
          path="/sso-callback"
          element={<AuthenticateWithRedirectCallback />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}