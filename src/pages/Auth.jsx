import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSignUp, useSignIn, useClerk } from '@clerk/clerk-react'
import Navbar from '../components/Navbar'
import './Auth.css'

export default function Auth() {
  const [mode, setMode] = useState('signup') // 'signup' | 'login'
  const [step, setStep] = useState('form')   // 'form' | 'verify'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signUp, setActive: setActiveSignUp } = useSignUp()
  const { signIn, setActive: setActiveSignIn } = useSignIn()
  const navigate = useNavigate()

  function switchMode(next) {
    setMode(next)
    setStep('form')
    setError('')
    setCode('')
  }

  // ── Email / password submit ────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }

    setLoading(true)
    try {
      if (mode === 'signup') {
        const result = await signUp.create({ emailAddress: email, password })

        if (result.status === 'complete') {
          await setActiveSignUp({ session: result.createdSessionId })
          navigate('/upload')
        } else {
          // Email verification required — send the code and show verify step
          await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
          setStep('verify')
        }
      } else {
        const result = await signIn.create({ identifier: email, password })

        if (result.status === 'complete') {
          await setActiveSignIn({ session: result.createdSessionId })
          navigate('/upload')
        } else {
          setError('Sign in could not be completed. Please try again.')
        }
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Email verification code submit ─────────────────────────────────────────
  async function handleVerify(e) {
    e.preventDefault()
    setError('')
    if (!code) { setError('Please enter the verification code.'); return }

    setLoading(true)
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        navigate('/upload')
      } else {
        setError('Verification failed. Please check your code.')
      }
    } catch (err) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  // ── Google OAuth ───────────────────────────────────────────────────────────
  async function handleGoogle() {
    setError('')
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/upload',
      })
    } catch (err) {
      setError(err.errors?.[0]?.longMessage ?? 'Google sign-in failed.')
    }
  }

  // ── Verify step UI ─────────────────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="auth-page">
        <Navbar />
        <div className="auth-body">
          <div className="auth-card">
            <h2 className="auth-title">Check Your Email</h2>
            <p className="auth-verify-hint">
              We sent a verification code to <strong>{email}</strong>
            </p>
            <form className="auth-form" onSubmit={handleVerify}>
              <div className="auth-field">
                <label className="auth-label">Verification Code</label>
                <input
                  className="auth-input auth-input--center"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  maxLength={6}
                  autoFocus
                />
              </div>
              {error && <p className="auth-error">{error}</p>}
              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? 'Verifying…' : 'Verify Email →'}
              </button>
            </form>
            <p className="auth-switch">
              <button className="auth-switch-btn" onClick={() => setStep('form')}>
                ← Back
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Main form UI ───────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <Navbar />
      <div className="auth-body">
        <div className="auth-card">
          <h2 className="auth-title">
            {mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
          </h2>

          {/* Google button */}
          <button className="auth-google" onClick={handleGoogle} type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.5 33.7 29.8 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.4-.1-2.7-.5-4z"/>
              <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.9 6.3 14.7z"/>
              <path fill="#FBBC05" d="M24 45c5.4 0 10.3-1.8 14.1-4.9l-6.5-5.3C29.6 36.5 26.9 37 24 37c-5.7 0-10.5-3.4-12.8-8.3l-7 5.4C7.7 41.1 15.3 45 24 45z"/>
              <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-1.1 3-3.4 5.5-6.3 7l6.5 5.3C40.2 37.6 44.5 31.3 44.5 24c0-1.4-.2-2.7-.5-4z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <input
                className="auth-input"
                type="email"
                placeholder="johndoe@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                className="auth-input"
                type="password"
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
                : (mode === 'signup' ? 'Sign Up →' : 'Log In →')
              }
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('login')}>Log in</button>
              </>
            ) : (
              <>Don't have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('signup')}>Sign up</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
