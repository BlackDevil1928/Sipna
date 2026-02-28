import { useState, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isMobileDevice } from './utils/deviceDetector'

// ── Lazy Load Pages ──────────────────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Navbar = lazy(() => import('./components/layout/Navbar'))
const Sidebar = lazy(() => import('./components/layout/Sidebar'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Analytics = lazy(() => import('./pages/Analytics'))
const AlertsPage = lazy(() => import('./pages/Alerts'))
const MobileCameraPage = lazy(() => import('./pages/MobileCameraPage'))

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0e1a] bg-grid p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4 opacity-20">🚧</div>
        <h2 className="text-lg font-semibold text-[#8a9ab5]">{title}</h2>
        <p className="text-sm text-[#4a5568] mt-1">Coming in next release</p>
      </div>
    </div>
  )
}

function FullSpinner() {
  return (
    <div className="h-screen w-screen bg-[#060a12] flex items-center justify-center text-[#00d4ff]">
      <div className="w-8 h-8 border-2 border-t-[#00d4ff] border-r-transparent border-b-[#00d4ff] border-l-transparent rounded-full animate-spin" />
    </div>
  )
}

function DashboardLayout() {
  const [selectedSite, setSelectedSite] = useState('SITE-01')
  const [connected, setConnected] = useState(false)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar
        selectedSite={selectedSite}
        onSiteChange={setSelectedSite}
        connected={connected}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <Routes>
          <Route index element={<Dashboard selectedSite={selectedSite} onConnect={setConnected} />} />
          <Route path="analytics" element={<Analytics selectedSite={selectedSite} />} />
          <Route path="alerts" element={<AlertsPage selectedSite={selectedSite} />} />
          <Route path="sites" element={<PlaceholderPage title="Sites Management" />} />
          <Route path="settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </div>
  )
}

export default function App() {
  const isMobile = isMobileDevice()
  const isPairRoute = window.location.pathname === '/pair'

  // Mobile devices and QR pair route always go to camera
  if (isPairRoute || isMobile) {
    return (
      <BrowserRouter>
        <Suspense fallback={<FullSpinner />}>
          <MobileCameraPage />
        </Suspense>
      </BrowserRouter>
    )
  }

  // Desktop: Landing page + Dashboard routes
  return (
    <BrowserRouter>
      <Suspense fallback={<FullSpinner />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard/*" element={<DashboardLayout />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
