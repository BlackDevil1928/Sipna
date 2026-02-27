"""
Camera prediction routes — processes frames from mobile camera nodes.

Pipeline:
  1. Decode base64 JPEG → OpenCV BGR array
  2. Run through PyTorch severity model (deterministic)
  3. Persist prediction + alerts to PostgreSQL
  4. Broadcast over WebSocket to dashboard
  5. Fire critical alert monitor for Vapi calls
"""

import base64
import asyncio
from datetime import datetime

import cv2
import numpy as np
from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import Session

from database import engine
from models.prediction_model import Prediction, Alert
from services.websocket_manager import manager
from services.critical_alert_service import critical_alert_service
from services.ai_inference import pytorch_inference

router = APIRouter(prefix="/api", tags=["camera"])

# ── Alert Debounce System ─────────────────────────────────────────────────────
# Prevents alert spam by enforcing a cooldown between alerts of the same type.
# Only creates alerts when model confidence exceeds a meaningful threshold.
import time

ALERT_COOLDOWN_SECONDS = 30  # Minimum seconds between alerts of the same severity
ALERT_CONFIDENCE_THRESHOLD = 60.0  # Only alert when model is >60% confident

_last_alert_time: dict = {}  # key: f"{site_id}_{severity}" → timestamp

def _should_create_alert(site_id: str, severity: str, confidence: float) -> bool:
    """Returns True only if enough time has passed and confidence is high enough."""
    if confidence < ALERT_CONFIDENCE_THRESHOLD:
        return False
    key = f"{site_id}_{severity}"
    now = time.time()
    last = _last_alert_time.get(key, 0.0)
    if (now - last) < ALERT_COOLDOWN_SECONDS:
        return False
    _last_alert_time[key] = now
    return True


class FramePayload(BaseModel):
    image: str  # base64 data-URL or raw base64


def _decode_frame(b64: str) -> np.ndarray:
    """Decode base64 JPEG/PNG string → BGR numpy array."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]

    b64 = b64.strip()
    b64 += "=" * ((4 - len(b64) % 4) % 4)

    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img


@router.post("/predict-frame")
async def predict_frame(payload: FramePayload):
    """
    Receive a JPEG base64 frame from the frontend camera,
    run through the trained PyTorch model, persist to DB,
    broadcast result over WebSocket, and return the prediction.
    """
    try:
        img = await asyncio.to_thread(_decode_frame, payload.image)
        result = await asyncio.to_thread(pytorch_inference.predict, img)
        result["timestamp"] = datetime.utcnow().isoformat()
        result["site_id"] = "SITE-01"
    except Exception as e:
        # DO NOT send fake values on failure
        return {
            "status": "MODEL_ERROR",
            "confidence": 0.0,
            "turbidity": 0.0,
            "ph": 0.0,
            "compliance_score": 0.0,
            "error": f"Image processing failed: {e}"
        }

    # Skip DB/broadcast if model returned an error
    if result.get("status") == "MODEL_ERROR":
        return result

    debug = result.pop("_debug", {})

    # ── Persist to PostgreSQL ─────────────────────────────────────────────────
    pred = Prediction(
        timestamp=datetime.fromisoformat(result["timestamp"]),
        status=result["status"],
        confidence=result["confidence"],
        turbidity=result["turbidity"],
        ph=result["ph"],
        compliance_score=result["compliance_score"],
        site_id=result["site_id"],
    )
    with Session(engine) as session:
        session.add(pred)

        if result["status"] == "pollutant" and _should_create_alert(result["site_id"], "critical", result["confidence"]):
            alert = Alert(
                severity="critical",
                message=(
                    f"🎥 CAMERA: Pollutant detected! "
                    f"Turbidity={result['turbidity']} NTU, pH={result['ph']}"
                ),
                site_id=result["site_id"],
            )
            session.add(alert)
        elif result["status"] == "moderate" and result["turbidity"] > 15 and _should_create_alert(result["site_id"], "warning", result["confidence"]):
            alert = Alert(
                severity="warning",
                message=(
                    f"🎥 CAMERA: Elevated turbidity {result['turbidity']} NTU"
                ),
                site_id=result["site_id"],
            )
            session.add(alert)

        session.commit()

    # ── Broadcast over WebSocket ──────────────────────────────────────────────
    await manager.broadcast({"type": "prediction", "data": result})

    # ── Fire to Alert Monitor ─────────────────────────────────────────────────
    asyncio.create_task(critical_alert_service.check_and_trigger(result))

    return {**result, "_debug": debug}


async def process_ws_frame(msg: dict):
    """Process a camera frame received via WebSocket from a mobile edge node."""
    payload_img = msg.get("image")
    if not payload_img:
        return

    try:
        img = await asyncio.to_thread(_decode_frame, payload_img)
        result = await asyncio.to_thread(pytorch_inference.predict, img)
        result["timestamp"] = datetime.utcnow().isoformat()
        result["site_id"] = "SITE-01"
    except Exception as e:
        print(f"WS image processing error: {e}")
        return

    # Skip broadcast if model returned an error — do NOT send fake data
    if result.get("status") == "MODEL_ERROR":
        print(f"MODEL_ERROR: {result.get('_error', 'unknown')}")
        return

    result.pop("_debug", None)

    pred = Prediction(
        timestamp=datetime.fromisoformat(result["timestamp"]),
        status=result["status"],
        confidence=result["confidence"],
        turbidity=result["turbidity"],
        ph=result["ph"],
        compliance_score=result["compliance_score"],
        site_id=result["site_id"],
    )
    with Session(engine) as session:
        session.add(pred)

        if result["status"] == "pollutant" and _should_create_alert(result["site_id"], "critical", result["confidence"]):
            alert = Alert(
                severity="critical",
                message=f"🎥 REMOTE CAMERA: Pollutant detected! Turbidity={result['turbidity']} NTU, pH={result['ph']}",
                site_id=result["site_id"],
            )
            session.add(alert)
        elif result["status"] == "moderate" and result["turbidity"] > 15 and _should_create_alert(result["site_id"], "warning", result["confidence"]):
            alert = Alert(
                severity="warning",
                message=f"🎥 REMOTE CAMERA: Elevated turbidity {result['turbidity']} NTU",
                site_id=result["site_id"],
            )
            session.add(alert)

        session.commit()

    await manager.broadcast({
        "type": "live_stream",
        "image": payload_img,
        "prediction": result
    })
    await manager.broadcast({
        "type": "prediction",
        "data": result
    })

    # ── Fire to Alert Monitor ─────────────────────────────────────────────────
    asyncio.create_task(critical_alert_service.check_and_trigger(result))
