"""
AquaGuardian AI — Production Inference Engine

Loads the trained severity_cnn_model.pth (ResNet18, 3-class)
and performs deterministic inference on camera frames.

ROOT CAUSE FIX:
  The previous version used random.uniform() to generate turbidity, pH,
  and compliance values AFTER classification. This caused the dashboard
  to show wildly fluctuating numbers even when the camera scene was static.

  This rewrite derives ALL numerical values deterministically from the
  model's softmax probability distribution. Same frame = same numbers.

Class mapping (from training):
  Index 0 → "clean"    (UI: "clear")
  Index 1 → "moderate" (UI: "moderate")
  Index 2 → "severe"   (UI: "pollutant")
"""

import os
import torch
import torch.nn as nn
import numpy as np
import logging

from services.preprocessing import validate_frame, preprocess_frame

logger = logging.getLogger("PyTorchInference")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "severity_cnn_model.pth")

# ── Explicit class mapping — single source of truth ─────────────────────────
CLASS_MAP = {
    0: "clear",      # training label: "clean"
    1: "moderate",   # training label: "moderate"
    2: "pollutant",  # training label: "severe"
}

# ── Deterministic value anchors per class ────────────────────────────────────
# These are the "typical" reference values for each water quality class.
# The final output is a probability-weighted blend of all three,
# producing stable, scene-dependent numbers with NO randomness.
CLASS_ANCHORS = {
    "clear":     {"turbidity": 2.0,   "ph": 7.2,  "compliance": 98.0},
    "moderate":  {"turbidity": 25.0,  "ph": 6.0,  "compliance": 65.0},
    "pollutant": {"turbidity": 85.0,  "ph": 3.5,  "compliance": 15.0},
}


class SeverityInferenceService:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.load_model()

    def load_model(self):
        try:
            from torchvision.models import resnet18

            logger.info(f"Loading severity model from {MODEL_PATH} on {self.device}...")

            # Reconstruct exact architecture
            self.model = resnet18()
            num_ftrs = self.model.fc.in_features
            self.model.fc = nn.Linear(num_ftrs, len(CLASS_MAP))

            # Load trained weights
            state_dict = torch.load(MODEL_PATH, map_location=self.device, weights_only=True)
            self.model.load_state_dict(state_dict)

            self.model = self.model.to(self.device)
            self.model.eval()

            # Verify eval mode
            assert not self.model.training, "CRITICAL: model.training is True after .eval()!"
            logger.info(f"Model loaded. training={self.model.training}, device={self.device}")

        except Exception as e:
            logger.error(f"MODEL LOAD FAILED: {e}", exc_info=True)
            self.model = None

    def predict(self, img_bgr: np.ndarray, debug: bool = False) -> dict:
        """
        Run inference on a single BGR frame.
        Returns deterministic prediction dict — NO random values.
        """
        # ── Guard: model not loaded ──────────────────────────────────────────
        if self.model is None:
            return {
                "status": "MODEL_ERROR",
                "confidence": 0.0,
                "turbidity": 0.0,
                "ph": 0.0,
                "compliance_score": 0.0,
                "_error": "Model failed to load during startup"
            }

        try:
            # ── Frame validation ─────────────────────────────────────────────
            validate_frame(img_bgr)

            # ── Preprocessing (deterministic) ────────────────────────────────
            input_tensor = preprocess_frame(img_bgr, debug=debug).to(self.device)

            # ── Forward pass ─────────────────────────────────────────────────
            with torch.no_grad():
                raw_logits = self.model(input_tensor)

            # ── Softmax probabilities (CrossEntropyLoss training assumed) ────
            probs = torch.nn.functional.softmax(raw_logits[0], dim=0)

            # ── Extract results ──────────────────────────────────────────────
            probs_list = probs.cpu().numpy().tolist()
            top_idx = int(torch.argmax(probs).item())
            top_conf = float(probs[top_idx].item()) * 100.0
            status = CLASS_MAP[top_idx]

            # ── Derive KPI values from probability-weighted blending ─────────
            # Instead of random values, we compute a weighted average across
            # all class anchors, weighted by each class's softmax probability.
            # This produces STABLE values that smoothly shift when the scene changes.
            turbidity = 0.0
            ph = 0.0
            compliance = 0.0
            for idx, class_name in CLASS_MAP.items():
                weight = probs_list[idx]
                anchors = CLASS_ANCHORS[class_name]
                turbidity  += weight * anchors["turbidity"]
                ph         += weight * anchors["ph"]
                compliance += weight * anchors["compliance"]

            result = {
                "status": status,
                "confidence": round(top_conf, 1),
                "turbidity": round(turbidity, 2),
                "ph": round(ph, 2),
                "compliance_score": round(compliance, 1),
            }

            if debug:
                result["_debug"] = {
                    "raw_logits": raw_logits[0].cpu().numpy().tolist(),
                    "probabilities": {CLASS_MAP[i]: round(p, 4) for i, p in enumerate(probs_list)},
                    "preprocessing": {
                        "tensor_min": float(input_tensor.min().item()),
                        "tensor_max": float(input_tensor.max().item()),
                        "tensor_mean": float(input_tensor.mean().item()),
                    },
                }
                logger.info(f"[DEBUG INFERENCE] logits={result['_debug']['raw_logits']}, "
                           f"probs={result['_debug']['probabilities']}, "
                           f"predicted={status} ({top_conf:.1f}%)")

            return result

        except Exception as e:
            logger.error(f"INFERENCE FAILED: {e}", exc_info=True)
            return {
                "status": "MODEL_ERROR",
                "confidence": 0.0,
                "turbidity": 0.0,
                "ph": 0.0,
                "compliance_score": 0.0,
                "_error": str(e)
            }

    def debug_inference(self, img_bgr: np.ndarray) -> dict:
        """Full debug output for the /api/debug/inference endpoint."""
        return self.predict(img_bgr, debug=True)


# ── Singleton ────────────────────────────────────────────────────────────────
pytorch_inference = SeverityInferenceService()
