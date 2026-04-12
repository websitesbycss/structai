import { useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import Navbar from '../components/Navbar'
import heroBg from '../assets/hero.png'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const { isSignedIn } = useUser()

  function handleGetStarted() {
    if (isSignedIn) {
      navigate('/upload')
    } else {
      navigate('/auth')
    }
  }

  return (
    <div className="home">
      <Navbar />
      <section
        className="home-hero"
        style={{ backgroundImage: `url(${heroBg})` }}
      >
        <div className="home-hero-content">
          <h1 className="home-headline">
            Analyze Your<br />Models in Seconds
          </h1>
          <p className="home-sub">
            StructAI makes it easy to get feedback on the<br />
            structural integrity of your 3D designs.
          </p>
          <button className="home-cta" onClick={handleGetStarted}>
            Get Started →
          </button>
        </div>
      </section>
    </div>
  )
}
