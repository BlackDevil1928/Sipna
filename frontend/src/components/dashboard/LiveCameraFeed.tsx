import { useRef, useState, useCallback, useEffect } from 'react'
import { Camera, CameraOff, RefreshCw, Cpu, Eye, ZapOff } from 'lucide-react'
import type { Prediction } from '../../services/api'

const ANALYZE_ENDPOINT = '/api/predict-frame'
const CAPTURE_INTERVAL_MS = 1000
const MAX_WIDTH = 480

interface LiveCameraFeedProps {
    ws: WebSocket | null
    siteId: string
    prediction: Prediction | null
}

const STATUS_CFG = {
    clear: { label: 'CLEAR', color: '#10b981', border: 'border-emerald-500/40', glow: '0 0 20px rgba(16,185,129,0.25)' },
    moderate: { label: 'MODERATE', color: '#f59e0b', border: 'border-amber-500/40', glow: '0 0 20px rgba(245,158,11,0.25)' },
    pollutant: { label: 'POLLUTANT DETECTED', color: '#ef4444', border: 'border-red-500/50', glow: '0 0 24px rgba(239,68,68,0.35)' },
}

export default function LiveCameraFeed({ ws, siteId, prediction }: LiveCameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [cameraOn, setCameraOn] = useState(false)
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    // prediction is now passed via props from the WebSocket broadcast
    const [analyzing, setAnalyzing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [fps, setFps] = useState<number | null>(null)
    const lastTsRef = useRef<number>(0)

    // ── Capture + send frame ────────────────────────────────────────────────
    const captureAndAnalyze = useCallback(async () => {
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 2) return

        // Scale to MAX_WIDTH keeping aspect ratio
        const scale = Math.min(1, MAX_WIDTH / video.videoWidth)
        canvas.width = Math.round(video.videoWidth * scale)
        canvas.height = Math.round(video.videoHeight * scale)

        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // JPEG @ 0.6 quality keeps size small
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6)
        // Send raw base64 without the 'data:image/jpeg;base64,' prefix
        const b64 = dataUrl.split(',')[1]

        if (ws && ws.readyState === WebSocket.OPEN) {
            setAnalyzing(true)
            try {
                ws.send(JSON.stringify({
                    type: 'camera_frame',
                    site_id: siteId,
                    image: b64
                }))
            } catch (err) {
                // Ignore socket abruptly closing
            }

            // Note: Since it's WS, prediction will arrive asynchronously via the standard websocket handler in Dashboard
            setTimeout(() => setAnalyzing(false), 300)

            setError(null)
        } else {
            setError('WebSocket disconnected')
        }
    }, [ws, siteId])

    // ── Start camera ─────────────────────────────────────────────────────────
    const startCamera = useCallback(async (facing: 'environment' | 'user') => {
        setError(null)
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop())
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: facing },
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
            // Start periodic capture
            if (intervalRef.current) clearInterval(intervalRef.current)
            intervalRef.current = setInterval(captureAndAnalyze, CAPTURE_INTERVAL_MS)
        } catch (err: any) {
            setError(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access and try again.'
                    : err.name === 'NotFoundError'
                        ? 'No camera found on this device.'
                        : `Camera error: ${err.message}`
            )
        }
    }, [captureAndAnalyze])

    // ── Stop camera ───────────────────────────────────────────────────────────
    const stopCamera = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current)
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
        if (videoRef.current) videoRef.current.srcObject = null
        setCameraOn(false)
        setFps(null)
    }, [])

    // ── Switch front ↔ back ───────────────────────────────────────────────────
    const switchCamera = useCallback(() => {
        const next: 'environment' | 'user' = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(next)
        if (cameraOn) startCamera(next)
    }, [facingMode, cameraOn, startCamera])

    // Cleanup on unmount
    useEffect(() => () => { stopCamera() }, [stopCamera])

    const cfg = STATUS_CFG[prediction?.status ?? 'clear']

    return (
        <div className="glass-card overflow-hidden flex flex-col">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d40] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#00d4ff]" />
                    <span className="text-sm font-semibold text-[#f0f6ff]">Mobile Camera Feed</span>
                    {cameraOn && (
                        <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold tracking-widest ml-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full pulse-live" />
                            LIVE CAMERA
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {fps !== null && (
                        <span className="text-[10px] font-mono text-[#4a5568]">
                            ~{fps} fps
                        </span>
                    )}
                    {analyzing && (
                        <span className="text-[10px] text-[#a78bfa] animate-pulse">AI analysing…</span>
                    )}
                </div>
            </div>

            {/* ── Video area ─────────────────────────────────────────────────── */}
            <div
                className="relative w-full bg-[#060a12] overflow-hidden"
                style={{ aspectRatio: '16/7', boxShadow: cameraOn ? cfg.glow : 'none' }}
            >
                {/* Actual camera video */}
                <video
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                    style={{ display: cameraOn ? 'block' : 'none' }}
                />
                {/* Hidden canvas for frame capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* "No camera" placeholder */}
                {!cameraOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-grid">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl border border-[#1e2d40] flex items-center justify-center mx-auto bg-[#0d1221]">
                                <Camera className="w-8 h-8 text-[#1e2d40]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8a9ab5]">Camera Off</p>
                                <p className="text-xs text-[#4a5568] mt-0.5">Press "Start Camera" to begin analysis</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Live overlays (only when camera on + prediction exists) ── */}
                {cameraOn && prediction && (
                    <>
                        {/* Corner brackets */}
                        {[
                            'top-3 left-3 border-t-2 border-l-2',
                            'top-3 right-3 border-t-2 border-r-2',
                            'bottom-3 left-3 border-b-2 border-l-2',
                            'bottom-3 right-3 border-b-2 border-r-2',
                        ].map((cls, i) => (
                            <div
                                key={i}
                                className={`absolute w-5 h-5 ${cls} transition-colors duration-500`}
                                style={{ borderColor: `${cfg.color}80` }}
                            />
                        ))}

                        {/* Top-left: status pill */}
                        <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
                            <div
                                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold backdrop-blur-sm bg-black/50 ${cfg.border}`}
                                style={{ color: cfg.color }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full pulse-live"
                                    style={{ background: cfg.color }}
                                />
                                {cfg.label}
                            </div>
                            <div className="text-xs font-mono bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded text-white/60">
                                CONF: <span className="text-white font-bold">{prediction.confidence}%</span>
                            </div>
                        </div>

                        {/* Top-right: sensor readouts */}
                        <div className="absolute top-4 right-4 z-10 space-y-1.5">
                            {[
                                { label: 'TURBIDITY', value: `${prediction.turbidity} NTU` },
                                { label: 'pH', value: prediction.ph.toFixed(2) },
                                { label: 'COMPLY', value: `${prediction.compliance_score.toFixed(1)}%` },
                            ].map(({ label, value }) => (
                                <div
                                    key={label}
                                    className="flex items-center justify-between gap-4 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded text-xs font-mono"
                                >
                                    <span className="text-[#4a5568]">{label}</span>
                                    <span className="font-bold" style={{ color: '#00d4ff' }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Bottom: AI badge */}
                        <div className="absolute bottom-4 left-4 z-10">
                            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-[#1e2d40] px-3 py-1.5 rounded-lg">
                                <Cpu className="w-3.5 h-3.5 text-[#a78bfa]" />
                                <span className="text-xs text-[#a78bfa] font-medium">AquaVision CV Engine</span>
                            </div>
                        </div>
                    </>
                )}

                {/* Error overlay */}
                {error && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-20 p-4">
                        <div className="text-center max-w-xs">
                            <ZapOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
                            <p className="text-sm text-red-300 font-medium">{error}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Controls ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-3 border-t border-[#1e2d40] flex-shrink-0 flex-wrap">
                {!cameraOn ? (
                    <button
                        onClick={() => startCamera(facingMode)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-[#00d4ff] hover:from-cyan-500/30 hover:to-blue-500/30 transition-all duration-200"
                    >
                        <Camera className="w-4 h-4" />
                        Start Camera
                    </button>
                ) : (
                    <button
                        onClick={stopCamera}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all duration-200"
                    >
                        <CameraOff className="w-4 h-4" />
                        Stop Camera
                    </button>
                )}

                <button
                    onClick={switchCamera}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#1e2d40] text-[#8a9ab5] hover:text-white hover:border-white/20 transition-all duration-200"
                >
                    <RefreshCw className="w-4 h-4" />
                    {facingMode === 'environment' ? 'Use Front Cam' : 'Use Rear Cam'}
                </button>

                <span className="ml-auto text-[10px] text-[#4a5568]">
                    Frame @ {CAPTURE_INTERVAL_MS / 1000}s interval · max {MAX_WIDTH}px
                </span>
            </div>
        </div>
    )
}
