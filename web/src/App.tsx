import { Component, ReactNode, useEffect } from 'react'

/** If anything throws while rendering, show a calm recovery panel instead of a blank page. */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('[pullhaus] render error', error) }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="wrap" style={{ padding: '96px 16px', textAlign: 'center' }}>
        <h1 className="headline" style={{ fontSize: 44 }}>Something went wrong.<span className="l2">Your funds are safe.</span></h1>
        <p className="lede" style={{ margin: '18px auto 26px' }}>The page hit an error. Nothing was sent. Reload to try again.</p>
        <button className="btn primary lg" onClick={() => location.reload()}>Reload</button>
      </div>
    )
  }
}
import { Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/common'
import Landing from './pages/Landing'
import Splash from './pages/Splash'
import HowItWorks from './pages/HowItWorks'
import AppShell from './pages/AppShell'
import Explorer from './pages/Explorer'
import Docs from './pages/Docs'
import PayPage from './pages/PayPage'

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <>
      <ScrollManager />
      {pathname !== '/' && <Nav />}
      <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/about" element={<Landing />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/pay/:id" element={<PayPage />} />
        <Route path="*" element={<Splash />} />
      </Routes>
      </ErrorBoundary>
    </>
  )
}
