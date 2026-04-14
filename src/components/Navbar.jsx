import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import logo from '../assets/logo.svg'
import './Navbar.css'

export default function Navbar() {
  const { user, isSignedIn, isLoaded } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const location = useLocation()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleUploadClick() {
    if (isSignedIn) {
      navigate('/upload')
    } else {
      navigate('/auth')
    }
  }

  function handleAboutClick(e) {
    e.preventDefault()
    if (location.pathname === '/') {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/#about')
    }
  }

  async function handleLogOut() {
    setDropdownOpen(false)
    await signOut()
    navigate('/')
  }

  // Avatar: profile image, or first letter of name/email, or generic icon
  const avatarLetter = user?.firstName?.[0]
    ?? user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()
    ?? '?'

  const avatarImage = user?.imageUrl

  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <img src={logo} alt="StructAI logo" className="navbar-logo" />
        <span className="navbar-name">
          <span className="navbar-struct">Struct</span>
          <span className="navbar-ai">AI</span>
        </span>
      </Link>

      <div className="navbar-links">
        <button className="navbar-link" onClick={handleUploadClick}>Upload</button>
        <a href="#about" className="navbar-link" onClick={handleAboutClick}>About</a>

        {isLoaded && isSignedIn ? (
          <div className="navbar-avatar-wrap" ref={dropdownRef}>
            <button
              className="navbar-avatar"
              onClick={() => setDropdownOpen(v => !v)}
              aria-label="Profile menu"
            >
              {avatarImage
                ? <img src={avatarImage} alt="avatar" className="navbar-avatar-img" />
                : avatarLetter
              }
            </button>
            {dropdownOpen && (
              <div className="navbar-dropdown">
                <div className="navbar-dropdown-email">{displayEmail}</div>
                <button className="navbar-dropdown-item" onClick={handleLogOut}>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/auth" className="navbar-btn">Sign Up →</Link>
        )}
      </div>
    </nav>
  )
}
