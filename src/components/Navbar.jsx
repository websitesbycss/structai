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
  const [menuOpen, setMenuOpen] = useState(false)
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

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function handleUploadClick() {
    setMenuOpen(false)
    navigate(isSignedIn ? '/upload' : '/auth')
  }

  function handleAboutClick(e) {
    e.preventDefault()
    setMenuOpen(false)
    if (location.pathname === '/') {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/#about')
    }
  }

  async function handleLogOut() {
    setDropdownOpen(false)
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  const avatarLetter = user?.firstName?.[0]
    ?? user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()
    ?? '?'

  const avatarImage = user?.imageUrl
  const displayEmail = user?.primaryEmailAddress?.emailAddress ?? ''

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
          <img src={logo} alt="StructAI logo" className="navbar-logo" />
          <span className="navbar-name">
            <span className="navbar-struct">Struct</span>
            <span className="navbar-ai">AI</span>
          </span>
        </Link>

        {/* Desktop links */}
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

        {/* Mobile hamburger */}
        <button
          className="navbar-hamburger"
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile overlay backdrop */}
      <div
        className={`navbar-mobile-overlay ${menuOpen ? 'navbar-mobile-overlay--open' : ''}`}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <div className={`navbar-mobile-menu ${menuOpen ? 'navbar-mobile-menu--open' : ''}`} aria-hidden={!menuOpen}>
        <div className="navbar-mobile-top">
          <Link to="/" className="navbar-brand" onClick={() => setMenuOpen(false)}>
            <img src={logo} alt="StructAI logo" className="navbar-logo" />
            <span className="navbar-name">
              <span className="navbar-struct">Struct</span>
              <span className="navbar-ai">AI</span>
            </span>
          </Link>
          <button className="navbar-mobile-close-btn" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <nav className="navbar-mobile-nav">
          <button className="navbar-mobile-link" onClick={handleUploadClick}>
            Upload
          </button>
          <a href="#about" className="navbar-mobile-link" onClick={handleAboutClick}>
            About
          </a>
        </nav>

        <div className="navbar-mobile-footer">
          {isLoaded && isSignedIn ? (
            <>
              <div className="navbar-mobile-user">
                {avatarImage
                  ? <img src={avatarImage} alt="avatar" className="navbar-mobile-user-img" />
                  : <div className="navbar-mobile-user-letter">{avatarLetter}</div>
                }
                <span className="navbar-mobile-user-email">{displayEmail}</span>
              </div>
              <button className="navbar-mobile-signout" onClick={handleLogOut}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/auth" className="navbar-mobile-signup" onClick={() => setMenuOpen(false)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Sign Up
            </Link>
          )}
        </div>
      </div>
    </>
  )
}
