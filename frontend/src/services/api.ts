const isProd = import.meta.env.PROD;
const API_BASE = isProd ? "https://aquaguardian-api.onrender.com" : "";

const wsProtocol = isProd ? 'wss:' : (window.location.protocol === 'https:' ? 'wss:' : 'ws:');
const WS_DOMAIN = isProd ? "aquaguardian-api.onrender.com" : window.location.host;
const WS_URL = `${wsProtocol}//${WS_DOMAIN}/ws`;

export interface Prediction {
    id?: number
    timestamp: string
    status: 'clear' | 'moderate' | 'pollutant'
    confidence: number
    turbidity: number
    ph: number
    compliance_score: number
    site_id: string
}

export interface Alert {
    id: number
    timestamp: string
    severity: 'info' | 'warning' | 'critical'
    message: string
    site_id: string
    acknowledged: boolean
}

// API Configuration:
// - Local dev: Leave .env empty → Vite proxy handles routing via relative paths
// - Production (Vercel): Set VITE_API_BASE_URL and VITE_WS_URL in .env
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = import.meta.env.VITE_WS_URL || `${wsProtocol}//${window.location.host}/ws`

// ─── REST API ────────────────────────────────────────────────────────────────

export async function fetchLatestPrediction(siteId = 'SITE-01'): Promise<Prediction | null> {
    try {
        const res = await fetch(`${BASE_URL}/api/predictions/latest?site_id=${siteId}`)
        if (!res.ok) return null
        return res.json()
    } catch {
        return null
    }
}

export async function fetchHistory(siteId = 'SITE-01', limit = 50): Promise<Prediction[]> {
    try {
        const res = await fetch(`${BASE_URL}/api/predictions/history?site_id=${siteId}&limit=${limit}`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function fetchSitesSummary(): Promise<Prediction[]> {
    try {
        const res = await fetch(`${BASE_URL}/api/predictions/sites/summary`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function fetchAlerts(siteId = 'SITE-01', limit = 50): Promise<Alert[]> {
    try {
        const res = await fetch(`${BASE_URL}/api/alerts/?site_id=${siteId}&limit=${limit}`)
        if (!res.ok) return []
        return res.json()
    } catch {
        return []
    }
}

export async function acknowledgeAlert(alertId: number): Promise<void> {
    await fetch(`${BASE_URL}/api/alerts/${alertId}/acknowledge`, { method: 'PATCH' })
}

export async function fetchPairingSession(): Promise<string | null> {
    try {
        const res = await fetch(`${BASE_URL}/api/pair/create-session`, { method: 'POST' })
        if (!res.ok) return null
        const data = await res.json()
        return data.session_id
    } catch {
        return null
    }
}

// ─── WebSocket ───────────────────────────────────────────────────────────────

export function createWebSocket(
    onPrediction: (pred: Prediction) => void,
    onLiveStream?: (img: string, pred: Prediction) => void,
    onError?: () => void,
    onSessionConnected?: (sessionId: string) => void
): WebSocket {
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'prediction') {
                onPrediction(msg.data as Prediction)
            } else if (msg.type === 'live_stream') {
                onLiveStream?.(msg.image, msg.prediction as Prediction)
            } else if (msg.type === 'SESSION_CONNECTED') {
                onSessionConnected?.(msg.session_id)
            }
        } catch { /* ignore malformed */ }
    }

    ws.onerror = () => onError?.()

    // Ping every 5s to keep alive
    const ping = setInterval(() => {
        try {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send('ping')
            } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
                clearInterval(ping)
            }
        } catch {
            clearInterval(ping)
        }
    }, 5000)

    ws.onclose = () => clearInterval(ping)

    return ws
}
