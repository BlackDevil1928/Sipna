"""
Debug endpoint for live inference diagnostics.

GET /api/debug/inference — returns raw logits, probabilities,
preprocessing stats, and predicted class for the last processed frame.

POST /api/debug/inference — accepts a base64 image and returns full debug output.
"""

import base64
import asyncio
import cv2
import numpy as np
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from services.ai_inference import pytorch_inference

router = APIRouter(prefix="/api/debug", tags=["debug"])


class DebugFramePayload(BaseModel):
    image: str  # base64-encoded JPEG/PNG


@router.post("/inference")
async def debug_inference(payload: DebugFramePayload):
    """
    Accept a base64 image and return full debug inference output:
    - raw logits
    - softmax probabilities per class
    - predicted class + confidence
    - preprocessing tensor stats (min, max, mean)
    - derived KPI values (turbidity, pH, compliance)
    """
    try:
        # Decode
        b64 = payload.image
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        b64 = b64.strip()
        b64 += "=" * ((4 - len(b64) % 4) % 4)
        raw = base64.b64decode(b64)
        arr = np.frombuffer(raw, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

        if img is None:
            return {"error": "Could not decode image"}

        # Run debug inference
        result = await asyncio.to_thread(pytorch_inference.debug_inference, img)
        result["timestamp"] = datetime.utcnow().isoformat()
        result["frame_shape"] = list(img.shape)
        result["frame_dtype"] = str(img.dtype)

        return result

    except Exception as e:
        return {"error": str(e)}


@router.get("/model-status")
async def model_status():
    """Quick health check for the loaded model."""
    if pytorch_inference.model is None:
        return {
            "loaded": False,
            "error": "Model failed to load during startup"
        }

    return {
        "loaded": True,
        "device": str(pytorch_inference.device),
        "training_mode": pytorch_inference.model.training,
        "class_map": {str(k): v for k, v in pytorch_inference.model is not None and {0: "clear", 1: "moderate", 2: "pollutant"}.items()},
        "fc_output_features": pytorch_inference.model.fc.out_features,
    }
