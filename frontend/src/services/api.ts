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

// With Vite proxy configured, we can just use relative paths for REST APIs.
// This magically solves HTTPS/HTTP Mixed Content errors when using Ngrok!
const BASE_URL = ''
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
const WS_URL = `${wsProtocol}//${window.location.host}/ws`

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

// ─── WebSocket ───────────────────────────────────────────────────────────────

export function createWebSocket(
    onPrediction: (pred: Prediction) => void,
    onLiveStream?: (img: string, pred: Prediction) => void,
    onError?: () => void
): WebSocket {
    const ws = new WebSocket(WS_URL)

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'prediction') {
                onPrediction(msg.data as Prediction)
            } else if (msg.type === 'live_stream') {
                onLiveStream?.(msg.image, msg.prediction as Prediction)
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
