import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Nav } from './components/common'
import Landing from './pages/Landing'
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
  return (
    <>
      <ScrollManager />
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app/*" element={<AppShell />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="/pay/:id" element={<PayPage />} />
        <Route path="*" element={<Landing />} />
      </Routes>
    </>
  )
}
