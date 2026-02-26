import { Cpu, ZapOff, Wifi } from 'lucide-react'
import type { Prediction } from '../../services/api'

interface LiveRemoteFeedProps {
    latestFrame: string | null
    prediction: Prediction | null
    connected: boolean
}

const STATUS_CFG = {
    clear: { label: 'CLEAR', color: '#10b981', border: 'border-emerald-500/40', glow: '0 0 20px rgba(16,185,129,0.25)' },
    moderate: { label: 'MODERATE', color: '#f59e0b', border: 'border-amber-500/40', glow: '0 0 20px rgba(245,158,11,0.25)' },
    pollutant: { label: 'POLLUTANT DETECTED', color: '#ef4444', border: 'border-red-500/50', glow: '0 0 24px rgba(239,68,68,0.35)' },
}

export default function LiveRemoteFeed({ latestFrame, prediction, connected }: LiveRemoteFeedProps) {
    const cfg = STATUS_CFG[prediction?.status ?? 'clear']

    return (
        <div className="glass-card overflow-hidden flex flex-col h-full">
            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d40] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-[#a78bfa]" />
                    <span className="text-sm font-semibold text-[#f0f6ff]">Remote Camera Node</span>
                    {latestFrame && (
                        <span className="flex items-center gap-1.5 text-[10px] text-red-400 font-bold tracking-widest ml-1">
                            <span className="w-2 h-2 bg-red-500 rounded-full pulse-live" />
                            LIVE STREAM
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {connected ? (
                        <span className="text-[10px] text-[#10b981] font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full"></span>
                            Connected
                        </span>
                    ) : (
                        <span className="text-[10px] text-[#ef4444] font-mono flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#ef4444] rounded-full"></span>
                            Offline
                        </span>
                    )}
                </div>
            </div>

            {/* ── Video area ─────────────────────────────────────────────────── */}
            <div
                className="relative w-full bg-[#060a12] overflow-hidden flex-1"
                style={{ aspectRatio: '16/7', boxShadow: latestFrame ? cfg.glow : 'none' }}
            >
                {/* Image Stream */}
                {latestFrame ? (
                    <img
                        src={`data:image/jpeg;base64,${latestFrame}`}
                        alt="Remote Feed"
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-grid">
                        <div className="text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl border border-[#1e2d40] flex items-center justify-center mx-auto bg-[#0d1221]">
                                <Wifi className="w-8 h-8 text-[#1e2d40]" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#8a9ab5]">Waiting for Camera Node</p>
                                <p className="text-xs text-[#4a5568] mt-0.5">Start the camera on your mobile device</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Live overlays ── */}
                {latestFrame && prediction && (
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
                                <span className="text-xs text-[#a78bfa] font-medium">AquaVision Remote CV</span>
                            </div>
                        </div>
                    </>
                )}

                {!connected && latestFrame && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                        <div className="text-center">
                            <ZapOff className="w-8 h-8 text-red-500 mx-auto mb-2 opacity-80" />
                            <p className="text-sm font-medium text-red-400">Connection Lost</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
