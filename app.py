"""
Streamlit UI for Human Activity Recognition from video sequences.

UI only — all ML logic lives in inference.py.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import pandas as pd
import streamlit as st

from inference import (
    CLASS_NAMES,
    MODEL_PATH,
    ModelNotFoundError,
    VideoReadError,
    predict_activity,
)

SUPPORTED_EXTENSIONS = ("avi", "mp4", "mov")

st.set_page_config(
    page_title="Human Activity Recognition",
    page_icon="🎬",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    div[data-testid="stMetricValue"] { font-size: 1.75rem; }
    .har-subtitle { color: #6b7280; font-size: 1.05rem; margin-top: -0.5rem; margin-bottom: 1.5rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Human Activity Recognition")
st.markdown(
    '<p class="har-subtitle">Deep CNN-Based Video Activity Classification</p>',
    unsafe_allow_html=True,
)

with st.sidebar:
    st.header("Project info")
    st.markdown("**Model:** MobileNetV2")
    st.markdown("**Dataset:** UCF101")
    st.markdown("**Number of classes:** 5")
    st.markdown("**Frames per video:** 16")
    st.divider()
    st.caption("Supported uploads: `.avi`, `.mp4`, `.mov`")
    st.caption("Classes: " + ", ".join(CLASS_NAMES))
    if MODEL_PATH.is_file():
        st.success("Classifier weights found.")
    else:
        st.warning(
            "Place `human_activity_classifier.keras` in the `models/` folder "
            "before running predictions."
        )


uploaded = st.file_uploader(
    "Upload a video",
    type=list(SUPPORTED_EXTENSIONS),
    help="Accepted formats: AVI, MP4, MOV",
)

if uploaded is not None:
    st.subheader("Uploaded video")
    st.video(uploaded)
    st.caption(uploaded.name)

predict_clicked = st.button(
    "Predict Activity",
    type="primary",
    disabled=uploaded is None,
    use_container_width=False,
)

if predict_clicked and uploaded is not None:
    suffix = Path(uploaded.name).suffix or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(uploaded.getvalue())
        video_path = tmp.name

    try:
        with st.spinner("Analyzing video — sampling frames and running the classifier…"):
            result = predict_activity(video_path)

        st.success("Prediction complete")

        st.subheader("Sampled frames (16 uniform samples)")
        for row in range(4):
            cols = st.columns(4)
            for col in range(4):
                idx = row * 4 + col
                rgb = cv2.cvtColor(result.sampled_frames[idx], cv2.COLOR_BGR2RGB)
                with cols[col]:
                    st.image(rgb, caption=f"Frame {idx + 1}", use_container_width=True)

        st.subheader("Result")
        left, right = st.columns([1, 1])
        with left:
            st.metric("Predicted activity", result.predicted_class)
        with right:
            st.metric("Confidence", f"{result.confidence * 100:.1f}%")

        st.subheader("Class probabilities")
        prob_df = pd.DataFrame(
            {"Probability": [result.probabilities[name] for name in CLASS_NAMES]},
            index=CLASS_NAMES,
        )
        st.bar_chart(prob_df, height=320)

    except ModelNotFoundError:
        st.error(
            "The trained classifier was not found. Add your weights file at "
            "`models/human_activity_classifier.keras` and try again."
        )
    except VideoReadError as exc:
        st.error(f"Could not read this video. {exc}")
    except Exception:
        st.error(
            "Something went wrong during prediction. Check your video file and model path, "
            "then try again."
        )
    finally:
        try:
            Path(video_path).unlink(missing_ok=True)
        except OSError:
            pass

elif uploaded is None:
    st.info("Upload a video to enable **Predict Activity**.")
