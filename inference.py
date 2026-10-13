"""
ML inference for human activity recognition from video sequences.

All model loading, preprocessing, feature extraction, and prediction live here.
The Streamlit app (app.py) should import functions from this module only.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import tensorflow as tf
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input
from tensorflow.keras.layers import GlobalAveragePooling2D
from tensorflow.keras.models import Model

MODEL_PATH = Path(__file__).resolve().parent / "models" / "human_activity_classifier.keras"

NUM_FRAMES = 16
FRAME_SIZE = (224, 224)
FEATURE_DIM = 1280

CLASS_NAMES: list[str] = [
    "Biking",
    "JumpingJack",
    "PlayingGuitar",
    "PushUps",
    "WalkingWithDog",
]


class VideoInferenceError(Exception):
    """Base error for video inference failures."""


class VideoReadError(VideoInferenceError):
    """Raised when a video cannot be opened or has no readable frames."""


class ModelNotFoundError(VideoInferenceError):
    """Raised when the saved classifier weights are missing."""


@dataclass
class ActivityPrediction:
    """End-to-end prediction result for one video."""

    sampled_frames: list[np.ndarray]
    predicted_class: str
    confidence: float
    probabilities: dict[str, float]


_feature_extractor: Model | None = None


def load_feature_extractor() -> Model:
    """
    Build frozen MobileNetV2 (ImageNet) with GlobalAveragePooling2D.

    Each 224×224 RGB frame yields a 1280-dimensional feature vector.
    """
    global _feature_extractor
    if _feature_extractor is not None:
        return _feature_extractor

    backbone = MobileNetV2(
        weights="imagenet",
        include_top=False,
        input_shape=(*FRAME_SIZE, 3),
    )
    backbone.trainable = False
    pooled = GlobalAveragePooling2D(name="global_average_pooling2d")(backbone.output)
    model = Model(inputs=backbone.input, outputs=pooled, name="mobilenetv2_feature_extractor")
    model.trainable = False
    _feature_extractor = model
    return model


def load_classifier(model_path: Path = MODEL_PATH) -> tf.keras.Model:
    """Load the trained dense classifier from disk (1280-d input → 5 classes)."""
    path = Path(model_path)
    if not path.is_file():
        raise ModelNotFoundError(
            f"Classifier not found at '{path}'. "
            "Place your trained weights at models/human_activity_classifier.keras."
        )
    return tf.keras.models.load_model(path)


def extract_sampled_frames(video_path: str | Path, num_frames: int = NUM_FRAMES) -> list[np.ndarray]:
    """
    Extract exactly ``num_frames`` frames uniformly sampled across the video timeline.

    Returns BGR frames as read by OpenCV (uint8), before resize/preprocess.
    """
    path = Path(video_path)
    if not path.is_file():
        raise VideoReadError(f"Video file not found: '{path}'")

    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise VideoReadError(f"Could not open video: '{path}'")

    try:
        total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        if total <= 0:
            raise VideoReadError(f"Video has no frames or invalid frame count: '{path}'")

        if num_frames <= 0:
            raise ValueError("num_frames must be positive.")

        indices = np.linspace(0, total - 1, num=num_frames, dtype=int)
        frames: list[np.ndarray] = []
        for idx in indices:
            capture.set(cv2.CAP_PROP_POS_FRAMES, int(idx))
            ok, frame = capture.read()
            if not ok or frame is None:
                raise VideoReadError(
                    f"Failed to read frame {int(idx)} from '{path}' "
                    f"(uniform sample of {num_frames} frames)."
                )
            frames.append(frame)

        if len(frames) != num_frames:
            raise VideoReadError(
                f"Expected {num_frames} sampled frames from '{path}', got {len(frames)}."
            )
        return frames
    finally:
        capture.release()


def preprocess_frames(frames: list[np.ndarray]) -> np.ndarray:
    """
    Resize to 224×224, BGR→RGB, and apply MobileNetV2 ``preprocess_input``.

    Returns float32 array of shape (num_frames, 224, 224, 3).
    """
    if not frames:
        raise ValueError("No frames to preprocess.")

    batch = np.zeros((len(frames), FRAME_SIZE[0], FRAME_SIZE[1], 3), dtype=np.float32)
    for i, frame in enumerate(frames):
        if frame.ndim != 3 or frame.shape[2] != 3:
            raise VideoReadError(f"Invalid frame shape at index {i}: {getattr(frame, 'shape', None)}")
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, FRAME_SIZE, interpolation=cv2.INTER_AREA)
        batch[i] = preprocess_input(resized.astype(np.float32))
    return batch


def extract_frame_features(
    preprocessed: np.ndarray,
    feature_extractor: Model | None = None,
) -> np.ndarray:
    """
    Run frames through the CNN feature extractor.

    Returns array of shape (num_frames, 1280).
    """
    model = feature_extractor or load_feature_extractor()
    features = model.predict(preprocessed, verbose=0)
    if features.shape[-1] != FEATURE_DIM:
        raise VideoInferenceError(
            f"Expected {FEATURE_DIM}-d features per frame, got shape {features.shape}."
        )
    return np.asarray(features, dtype=np.float32)


def temporal_mean_pooling(frame_features: np.ndarray) -> np.ndarray:
    """
    Mean-pool frame features over time.

    Input: (num_frames, 1280) → output: (1280,).
    """
    if frame_features.ndim != 2:
        raise ValueError(f"frame_features must be 2-D, got shape {frame_features.shape}")
    if frame_features.shape[0] == 0:
        raise ValueError("frame_features has zero frames.")
    return np.mean(frame_features, axis=0).astype(np.float32)


def predict_class_probabilities(
    video_feature: np.ndarray,
    classifier: tf.keras.Model,
) -> np.ndarray:
    """Return softmax probabilities of shape (5,) in CLASS_NAMES order."""
    vector = np.asarray(video_feature, dtype=np.float32).reshape(1, -1)
    if vector.shape[1] != FEATURE_DIM:
        raise VideoInferenceError(
            f"Classifier expects {FEATURE_DIM}-d input, got {vector.shape[1]}."
        )
    probs = classifier.predict(vector, verbose=0)[0]
    probs = np.asarray(probs, dtype=np.float64).flatten()
    if probs.shape[0] != len(CLASS_NAMES):
        raise VideoInferenceError(
            f"Classifier returned {probs.shape[0]} outputs, expected {len(CLASS_NAMES)}."
        )
    return probs


def probabilities_to_dict(probs: np.ndarray) -> dict[str, float]:
    """Map probability vector to class names."""
    return {name: float(probs[i]) for i, name in enumerate(CLASS_NAMES)}


def get_top_prediction(probabilities: dict[str, float]) -> tuple[str, float]:
    """Return (best_label, best_probability) from a probability dictionary."""
    if not probabilities:
        raise ValueError("Empty probabilities.")
    label = max(probabilities, key=probabilities.get)
    return label, probabilities[label]


def predict_activity(
    video_path: str | Path,
    model_path: Path = MODEL_PATH,
) -> ActivityPrediction:
    """
    Full pipeline: video → 16 frames → MobileNetV2 features → temporal mean → classifier.

    Returns sampled BGR frames, predicted label, confidence, and all class probabilities.
    """
    sampled_frames = extract_sampled_frames(video_path, num_frames=NUM_FRAMES)
    preprocessed = preprocess_frames(sampled_frames)
    frame_features = extract_frame_features(preprocessed)
    video_feature = temporal_mean_pooling(frame_features)

    classifier = load_classifier(model_path)
    probs = predict_class_probabilities(video_feature, classifier)
    prob_dict = probabilities_to_dict(probs)
    predicted_class, confidence = get_top_prediction(prob_dict)

    return ActivityPrediction(
        sampled_frames=sampled_frames,
        predicted_class=predicted_class,
        confidence=confidence,
        probabilities=prob_dict,
    )
