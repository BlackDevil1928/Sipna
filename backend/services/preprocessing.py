"""
Preprocessing pipeline for the AquaGuardian Severity CNN Model.

This module ensures frames are transformed EXACTLY as they were during training:
  - BGR → RGB conversion
  - Resize to 224×224
  - Scale to [0, 1] float32
  - NO ImageNet normalization (confirmed by user)

All steps are deterministic — no randomness.
"""

import cv2
import numpy as np
import torch
import logging

logger = logging.getLogger("Preprocessing")


def validate_frame(frame: np.ndarray) -> bool:
    """
    Validates that a decoded frame is suitable for inference.
    Returns True if valid, raises ValueError otherwise.
    """
    if frame is None:
        raise ValueError("Frame is None — decode likely failed")
    if not hasattr(frame, 'shape') or len(frame.shape) != 3:
        raise ValueError(f"Frame has invalid shape: {getattr(frame, 'shape', 'N/A')}")
    if frame.shape[2] != 3:
        raise ValueError(f"Frame must have 3 channels (BGR), got {frame.shape[2]}")
    if frame.dtype != np.uint8:
        raise ValueError(f"Frame dtype must be uint8, got {frame.dtype}")
    if frame.shape[0] < 10 or frame.shape[1] < 10:
        raise ValueError(f"Frame too small: {frame.shape[:2]}")
    return True


def preprocess_frame(frame_bgr: np.ndarray, debug: bool = False) -> torch.Tensor:
    """
    Converts a raw OpenCV BGR frame into a model-ready PyTorch tensor.
    
    Pipeline:
      1) BGR → RGB
      2) Resize to 224×224
      3) Convert to float32, scale [0, 255] → [0.0, 1.0]
      4) Reorder HWC → CHW
      5) Add batch dimension → [1, 3, 224, 224]
    
    Returns:
      torch.Tensor of shape [1, 3, 224, 224], dtype float32
    """
    # Step 1: BGR → RGB
    frame_rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

    # Step 2: Resize to training resolution
    frame_resized = cv2.resize(frame_rgb, (224, 224), interpolation=cv2.INTER_LINEAR)

    # Step 3: Convert to float32 and scale to [0, 1]
    frame_float = frame_resized.astype(np.float32) / 255.0

    # Step 4: HWC → CHW
    frame_chw = np.transpose(frame_float, (2, 0, 1))  # [3, 224, 224]

    # Step 5: To tensor and add batch dimension
    tensor = torch.from_numpy(frame_chw).unsqueeze(0)  # [1, 3, 224, 224]

    if debug:
        logger.info(
            f"[PREPROCESS DEBUG] "
            f"Input shape: {frame_bgr.shape}, "
            f"Output shape: {tensor.shape}, "
            f"min={tensor.min().item():.4f}, "
            f"max={tensor.max().item():.4f}, "
            f"mean={tensor.mean().item():.4f}"
        )

    return tensor
