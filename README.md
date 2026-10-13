# Deep Convolutional Neural Networks for Human Activity Recognition Using Video Sequences

College project that classifies short video clips into five human activities. The convolutional model stays in Python. The browser app uploads a video and displays the JSON a backend returns.

## ActiVision AI (web dashboard)

The demonstration interface is a Vite + React + TypeScript app in `frontend/`. It does not run TensorFlow in the browser.

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints. The dev server is configured for port **4179**.

With no API URL, **Analyze Activity** shows a labeled demonstration result whose top class is Playing Guitar. That panel states the scores are sample figures, not a Keras prediction.

To call a real service, copy `frontend/.env.example` to `frontend/.env` and set:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Restart `npm run dev` after changing the variable. The app sends the video as multipart form field `video` to `POST /predict`. A successful response replaces the demonstration result. If the URL is set and the request fails, the app shows the error and does not invent a prediction.

### `POST /predict` response

```json
{
  "predicted_class": "PlayingGuitar",
  "confidence": 0.86,
  "probabilities": {
    "Biking": 0.04,
    "JumpingJack": 0.03,
    "PlayingGuitar": 0.86,
    "PushUps": 0.03,
    "WalkingWithDog": 0.04
  },
  "frames": ["data:image/jpeg;base64,..."]
}
```

- `predicted_class` is one of `Biking`, `JumpingJack`, `PlayingGuitar`, `PushUps`, `WalkingWithDog`.
- `confidence` is a number from 0 to 1.
- `probabilities` is optional. When present, include all five classes with scores from 0 to 1. The dashboard draws the five bars only from that object.
- `frames` is optional. Each item may be a data URL or raw base64 JPEG bytes. `GET /health` should return HTTP 200 when the service is ready; the status pill switches to **API connected** after that check or a successful prediction.

## Connect the exported Keras model

Place the trained classifier at:

```text
models/human_activity_classifier.keras
```

Do not commit the weights file. `inference.py` already implements the pipeline:

1. Sample **16 frames** uniformly from the video.
2. Resize each frame to **224 × 224** RGB and apply MobileNetV2 preprocessing.
3. Run the frozen ImageNet MobileNetV2 backbone plus global average pooling (**1280** features per frame).
4. Mean-pool the 16 vectors over time.
5. Pass the 1280-d vector to `models/human_activity_classifier.keras`.

Class index order is fixed: 0 Biking, 1 JumpingJack, 2 PlayingGuitar, 3 PushUps, 4 WalkingWithDog.

Install the API dependencies next to the existing Python packages, from the repository root:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt fastapi uvicorn python-multipart
```

Save the following as `server.py` in the repository root (it is not part of the frontend) and run `uvicorn server:app --host 127.0.0.1 --port 8000`:

```python
import base64
import tempfile
from pathlib import Path

import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from inference import (
    CLASS_NAMES,
    MODEL_PATH,
    ModelNotFoundError,
    VideoReadError,
    predict_activity,
)

app = FastAPI(title="ActiVision AI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:4179",
        "http://localhost:4179",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": MODEL_PATH.is_file(), "classes": CLASS_NAMES}


@app.post("/predict")
async def predict(video: UploadFile = File(...)):
    suffix = Path(video.filename or "clip.mp4").suffix or ".mp4"
    payload = await video.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(payload)
        path = tmp.name
    try:
        result = predict_activity(path)
    except ModelNotFoundError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except VideoReadError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        Path(path).unlink(missing_ok=True)

    frames = []
    for frame in result.sampled_frames:
        ok, encoded = cv2.imencode(".jpg", frame)
        if ok:
            frames.append("data:image/jpeg;base64," + base64.b64encode(encoded.tobytes()).decode("ascii"))

    return {
        "predicted_class": result.predicted_class,
        "confidence": result.confidence,
        "probabilities": result.probabilities,
        "frames": frames,
    }
```

Set `VITE_API_BASE_URL=http://127.0.0.1:8000` and restart the Vite server. Predictions then come from the Keras file through `inference.py`.

## Streamlit UI

The original Python UI is still available:

```bash
streamlit run app.py
```

It calls `predict_activity` directly and needs the same weights file.

## Project layout

```text
frontend/           React dashboard (ActiVision AI)
app.py              Streamlit UI
inference.py        Video I/O, MobileNetV2 features, classifier
requirements.txt    Python dependencies for the Streamlit app
models/             Place human_activity_classifier.keras here (not in git)
```

No UCF101 archive or sample videos are included. Training is out of scope.
