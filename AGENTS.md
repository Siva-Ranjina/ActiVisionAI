# Agent and developer rules

**Project:** Deep Convolutional Neural Networks for Human Activity Recognition Using Video Sequences

Permanent constraints for this college mini-project. Follow these when editing code, reviewing changes, or using AI assistants.

## Language and stack

- Use **Python** for all model and inference code.
- The original user-facing Python interface remains **Streamlit** (`streamlit run app.py`).
- An additional React dashboard lives in `frontend/` (ActiVision AI). The user explicitly requested it. Do not fold TensorFlow into that frontend. Keep ML in `inference.py`.
- Do not introduce further frontends unless the user explicitly asks.
- Do not introduce unnecessary frameworks, services, or complexity. Keep the implementation **simple, readable, and suitable for a college mini-project demonstration**.

## Architecture split

| File | Responsibility |
|------|----------------|
| `app.py` | **Streamlit UI only** — upload, display, results. No TensorFlow/Keras inference code. |
| `inference.py` | **All ML logic** — video I/O, MobileNetV2 features, pooling, load classifier, predict. |

The UI must call into `inference.py` (e.g. `predict_activity`); do not duplicate ML steps in `app.py`.

## Model weights (read-only)

- Expected path: **`models/human_activity_classifier.keras`**
- Users place their own trained file locally; do not commit large weight binaries unless the course requires it.
- **Do not retrain** the ML model in this repository.
- **Do not modify** `models/human_activity_classifier.keras` (no editing, re-saving, or “fixing” the binary).
- **Do not** add, copy, or download a `.keras` file as part of routine agent work unless the user explicitly provides and asks you to place it.

## Feature extraction pipeline (must preserve)

Do not replace or redesign this pipeline. Implementations in `inference.py` must match it exactly.

### MobileNetV2 backbone

- Use **`tensorflow.keras.applications.MobileNetV2`** with:
  - `weights="imagenet"`
  - `include_top=False`
  - `input_shape=(224, 224, 3)`
- **Keep MobileNetV2 frozen** (do not fine-tune or train backbone layers).
- Apply **`GlobalAveragePooling2D`** on the backbone output so **each frame** yields a **1280-dimensional** feature vector.

### Video → frames

- From each input video, extract **exactly 16 frames**, **uniformly sampled** across the timeline (even spacing in time or index space — stay consistent).
- **Resize** each frame to **224×224** and use **RGB** color order before preprocessing for MobileNetV2.

### Temporal aggregation and classifier

- Run all 16 frames through the frozen MobileNetV2 + GAP feature extractor.
- Apply **temporal mean pooling** across the 16 frame feature vectors (mean over the time/frame axis).
- The result must be a **1280-dimensional** vector passed as input to the saved classifier at `models/human_activity_classifier.keras`.
- Return **class probabilities** (softmax outputs) to the UI.

### Class index order (fixed)

Preserve this **exact** mapping between classifier outputs and labels:

| Index | Activity |
|------:|----------|
| 0 | Biking |
| 1 | JumpingJack |
| 2 | PlayingGuitar |
| 3 | PushUps |
| 4 | WalkingWithDog |

Do not reorder labels, rename indices, or add/remove classes without explicit user approval and a new trained model.

## Out of scope (unless explicitly requested)

- **No training or retraining** (including fine-tuning MobileNetV2 or the activity head).
- **No UCF101** (or other dataset) folders, archives, or download scripts in the repository.
- **No sample videos** or large media bundled in the repo unless explicitly requested.

## Repository hygiene

- Keep the Python root focused: `app.py`, `inference.py`, `requirements.txt`, `README.md`, `AGENTS.md`, and `models/` for the user’s `.keras` file, plus the requested `frontend/` dashboard.
- Avoid extra Python packages, notebooks, or duplicate apps unless the user requests them.
- Keep `requirements.txt` small: Streamlit, TensorFlow/Keras, OpenCV, NumPy (and only what UI/inference truly need).

## Quality bar before “done”

- **Always test** changes (run Streamlit, exercise inference on a real or test video, verify shapes and labels) before declaring the implementation complete.
- Fix regressions against the pipeline rules above; do not ship untested UI or inference changes.

## Quick checklist for reviewers and agents

- [ ] No retraining; `.keras` file untouched
- [ ] MobileNetV2 frozen, imagenet weights, GAP, 1280-dim per frame
- [ ] 16 uniformly sampled frames, 224×224 RGB
- [ ] Temporal mean → 1280-dim → saved classifier
- [ ] Five classes in the fixed index order
- [ ] ML only in `inference.py`; Streamlit only in `app.py`
- [ ] No UCF101 or unnecessary files
