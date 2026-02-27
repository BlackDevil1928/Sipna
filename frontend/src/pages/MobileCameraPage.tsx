import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, CameraOff, Wifi, ZapOff } from 'lucide-react'
import type { Prediction } from '../services/api'

// Since it's mobile ONLY, we can just use relative paths as setup in vite.config.ts proxy
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = `${wsProtocol}//${window.location.host}/ws`

const CAPTURE_INTERVAL_MS = 300 // Slower 1000ms for mobile nodes
const MAX_WIDTH = 480 // 480px width for efficient bandwidth

export default function MobileCameraPage() {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const wsRef = useRef<WebSocket | null>(null)

    const [wsConnected, setWsConnected] = useState(false)
    const [cameraOn, setCameraOn] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [prediction, setPrediction] = useState<Prediction | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const hasAutoStarted = useRef(false)

    // Parse URL for QR code pairing session
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const sid = params.get('session')
        if (sid) {
            setSessionId(sid)
        }
    }, [])

    // ── WebSocket Connection ─────────────────────────────────────────────────
    useEffect(() => {
        let ws: WebSocket | null = null

        const connect = () => {
            ws = new WebSocket(WS_URL)
            ws.onopen = () => {
                setWsConnected(true)
                // If we scanned a QR code, immediately tell the backend to pair us
                if (sessionId) {
                    ws?.send(JSON.stringify({ type: 'JOIN_SESSION', session_id: sessionId }))
                }
            }
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data)
                    // We only care about prediction results (not the video broadcast back to ourselves)
                    if (msg.type === 'prediction') {
                        setPrediction(msg.data)
                    }
                } catch { }
            }
            ws.onclose = () => {
                setWsConnected(false)
                setTimeout(connect, 3000)
            }
            wsRef.current = ws
        }

        connect()

        // Keep-alive heartbeat
        const ping = setInterval(() => {
            try {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send('ping')
                }
            } catch { }
        }, 5000)

        return () => {
            clearInterval(ping)
            ws?.close()
        }
    }, [sessionId])

    // ── Capture + Send Frame ─────────────────────────────────────────────────
    const captureAndSend = useCallback(() => {
        const video = videoRef.current
        const canvas = canvasRef.current
        const ws = wsRef.current

        if (!video || !canvas || video.readyState < 2) return
        if (!ws || ws.readyState !== WebSocket.OPEN) return

        const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        const b64 = dataUrl.split(',')[1]

        try {
            ws.send(JSON.stringify({
                type: 'camera_frame',
                site_id: 'SITE-01', // Hardcoded for this demo, could be selectable
                image: b64
            }))
        } catch (err) {
            // Drop frame if socket is busy/closed
        }
    }, [])

    // ── Start Camera ─────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setError(null)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setCameraOn(true)

            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(captureAndSend, CAPTURE_INTERVAL_MS)
        } catch (err: any) {
            setError(err.message || 'Camera access denied')
        }
    }, [captureAndSend])

    // ── Stop Camera ──────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setCameraOn(false)
        setPrediction(null)
    }, [])

    useEffect(() => () => stopCamera(), [stopCamera])

    // Auto-start camera if we arrived via a QR code scan
    useEffect(() => {
        if (sessionId && wsConnected && !cameraOn && !hasAutoStarted.current) {
            hasAutoStarted.current = true
            startCamera()
        }
    }, [sessionId, wsConnected, cameraOn, startCamera])

    // ── UI Colors ────────────────────────────────────────────────────────────
    const getStatusColor = () => {
        if (!prediction) return 'border-[#1e2d40]'
        if (prediction.status === 'clear') return 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
        if (prediction.status === 'moderate') return 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
        return 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
    }

    return (
        <div className="flex flex-col h-screen bg-[#060a12] text-white overflow-hidden">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-4 py-4 bg-[#0a0e1a] border-b border-[#1e2d40] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Wifi className="w-5 h-5 text-[#00d4ff]" />
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-[#f0f6ff]">Camera Node Mode</span>
                        <span className="text-[10px] text-[#8a9ab5]">Edge Streamer</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-[#1e2d40]">
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
                    <span className="text-xs font-mono text-[#8a9ab5]">
                        {wsConnected ? 'CONNECTED' : 'OFFLINE'}
                    </span>
                </div>
            </div>

            {/* Main Video Area */}
            <div className={`flex-1 relative bg-black border-y-2 transition-all duration-300 ${getStatusColor()}`}>
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ opacity: cameraOn ? 1 : 0 }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlays */}
                {!cameraOn && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0e1a] bg-grid">
                        <CameraOff className="w-12 h-12 text-[#1e2d40] mb-4" />
                        <p className="text-[#8a9ab5] font-medium text-center px-6">
                            Ready to stream edge diagnostics.<br />
                            Tap Connect below.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
                        <ZapOff className="w-12 h-12 text-red-500 mb-4" />
                        <p className="text-red-400 font-medium">{error}</p>
                    </div>
                )}

                {/* Live Prediction Overlay (Minimal for mobile) */}
                {cameraOn && prediction && (
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10">
                            <span className="text-xs font-bold uppercase tracking-wider text-white">
                                {prediction.status}
                            </span>
                        </div>
                        <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded border border-white/10 text-right">
                            <div className="text-[10px] text-white/70 font-mono">
                                NTU: <span className="text-[#00d4ff] font-bold">{prediction.turbidity}</span>
                            </div>
                            <div className="text-[10px] text-white/70 font-mono">
                                pH: <span className="text-[#00d4ff] font-bold">{prediction.ph}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Big Controls Footer */}
            <div className="p-6 bg-[#0a0e1a] border-t border-[#1e2d40] flex-shrink-0">
                {cameraOn ? (
                    <button
                        onClick={stopCamera}
                        className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/50 rounded-xl flex items-center justify-center gap-3 text-red-400 font-bold tracking-wide transition-all"
                    >
                        <CameraOff className="w-5 h-5" />
                        STOP STREAMING
                    </button>
                ) : (
                    <button
                        onClick={startCamera}
                        disabled={!wsConnected}
                        className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold tracking-wide transition-all shadow-lg ${wsConnected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90 active:scale-[0.98]'
                            : 'bg-[#1e2d40] text-[#4a5568] cursor-not-allowed'
                            }`}
                    >
                        <Camera className="w-5 h-5" />
                        CONNECT CAMERA
                    </button>
                )}
            </div>
        </div>
    )
}
