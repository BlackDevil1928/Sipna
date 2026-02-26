import { useState, useEffect, useCallback, useRef } from 'react'
import { Camera, Monitor } from 'lucide-react'
import KPICards from '../components/dashboard/KPICards'
import LiveMonitor from '../components/dashboard/LiveMonitor'
import LiveCameraFeed from '../components/dashboard/LiveCameraFeed'
import LiveRemoteFeed from '../components/dashboard/LiveRemoteFeed'
import AlertsPanel from '../components/dashboard/AlertsPanel'
import MultiSiteStatus from '../components/dashboard/MultiSiteStatus'
import TrendChart from '../components/dashboard/TrendChart'
import DistributionChart from '../components/dashboard/DistributionChart'
import {
    fetchLatestPrediction,
    fetchHistory,
    fetchAlerts,
    fetchSitesSummary,
    acknowledgeAlert,
    createWebSocket,
    type Prediction,
    type Alert,
} from '../services/api'

interface DashboardProps {
    selectedSite: string
    onConnect: (v: boolean) => void
}

export default function Dashboard({ selectedSite, onConnect }: DashboardProps) {
    const [prediction, setPrediction] = useState<Prediction | null>(null)
    const [history, setHistory] = useState<Prediction[]>([])
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [sites, setSites] = useState<Prediction[]>([])
    const [connected, setConnected] = useState(false)
    const [feedMode, setFeedMode] = useState<'simulated' | 'local_camera' | 'remote_stream'>('simulated')
    const [liveFrame, setLiveFrame] = useState<{ img: string, pred: Prediction } | null>(null)
    const wsRef = useRef<WebSocket | null>(null)

    // Initial load
    useEffect(() => {
        fetchLatestPrediction(selectedSite).then(p => p && setPrediction(p))
        fetchHistory(selectedSite, 50).then(setHistory)
        fetchAlerts(selectedSite, 50).then(setAlerts)
        fetchSitesSummary().then(setSites)
    }, [selectedSite])

    // WebSocket live updates
    useEffect(() => {
        let ws: WebSocket | null = null

        const connect = () => {
            ws = createWebSocket(
                (pred: Prediction) => {
                    setConnected(true)
                    onConnect(true)
                    setPrediction(pred)
                    setHistory(prev => [...prev, pred].slice(-60))
                    if (pred.status === 'pollutant' || (pred.status === 'moderate' && pred.turbidity > 15)) {
                        fetchAlerts(selectedSite, 50).then(setAlerts)
                    }
                },
                (img: string, pred: Prediction) => {
                    setConnected(true)
                    onConnect(true)
                    setLiveFrame({ img, pred })
                    // History and prediction already handled by standard prediction WS event which arrives simultaneously
                },
                () => {
                    setConnected(false)
                    onConnect(false)
                    setTimeout(connect, 3000)
                }
            )

            ws.onopen = () => { setConnected(true); onConnect(true) }
            ws.onclose = () => {
                setConnected(false)
                onConnect(false)
                setTimeout(connect, 3000)
            }
            wsRef.current = ws
        }

        connect()
        return () => { ws?.close() }
    }, [selectedSite])

    // Refresh sites every 30s
    useEffect(() => {
        const interval = setInterval(() => fetchSitesSummary().then(setSites), 30000)
        return () => clearInterval(interval)
    }, [])

    const handleAcknowledge = useCallback((id: number) => {
        acknowledgeAlert(id).then(() => {
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a))
        })
    }, [])

    return (
        <div className="flex-1 overflow-y-auto bg-[#0a0e1a] bg-grid p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between fade-in-up">
                <div>
                    <h2 className="text-lg font-bold text-[#f0f6ff]">Live Monitoring Dashboard</h2>
                    <p className="text-sm text-[#4a5568] mt-0.5">
                        {selectedSite} • Real-time AI-powered water quality analysis
                    </p>
                </div>
                {/* Feed mode toggle */}
                <div className="flex items-center gap-1 p-1 glass-card rounded-lg border border-[#1e2d40]">
                    <button
                        onClick={() => setFeedMode('simulated')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedMode === 'simulated'
                            ? 'bg-[#00d4ff20] text-[#00d4ff] border border-[#00d4ff30]'
                            : 'text-[#8a9ab5] hover:text-white'
                            }`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Simulated
                    </button>
                    <button
                        onClick={() => setFeedMode('local_camera')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedMode === 'local_camera'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'text-[#8a9ab5] hover:text-white'
                            }`}
                    >
                        <Camera className="w-3.5 h-3.5" /> Local Node Send
                    </button>
                    <button
                        onClick={() => setFeedMode('remote_stream')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${feedMode === 'remote_stream'
                            ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                            : 'text-[#8a9ab5] hover:text-white'
                            }`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Remote Watch
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="fade-in-up">
                <KPICards prediction={prediction} />
            </div>

            {/* Main grid: monitor/camera + alerts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 fade-in-up">
                <div className="xl:col-span-2">
                    {feedMode === 'local_camera' ? (
                        <LiveCameraFeed ws={wsRef.current} siteId={selectedSite} prediction={prediction} />
                    ) : feedMode === 'remote_stream' ? (
                        <LiveRemoteFeed latestFrame={liveFrame?.img ?? null} prediction={liveFrame?.pred ?? null} connected={connected} />
                    ) : (
                        <LiveMonitor prediction={prediction} connected={connected} />
                    )}
                </div>
                <div>
                    <AlertsPanel alerts={alerts} onAcknowledge={handleAcknowledge} />
                </div>
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in-up">
                <div className="lg:col-span-2">
                    <TrendChart history={history} />
                </div>
                <div>
                    <DistributionChart history={history} />
                </div>
            </div>

            {/* Multi-site */}
            <div className="fade-in-up">
                <MultiSiteStatus sites={sites} />
            </div>
        </div>
    )
}
