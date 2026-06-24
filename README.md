# AI Trail Prototype

Quick prototype workspace for the CSMA / ACSM AI Trail entrance concept.

## Concept

The attached proposal reframes the museum entrance AI wall as an introduction to the AI Trail. Instead of placing the Prompt Lab at the entrance, the wall becomes a short passive interaction:

- Ask visitors: "How do you feel about the future of AI?"
- Use a live camera feed to detect a face and facial expression.
- Show a diagnostic-style overlay on top of the camera image.
- Map the detected expression to a public-facing sentiment such as Curious, Excited, Thoughtful, Concerned, Anxious, Resistant, or Distrustful.
- Optionally drive the LED mesh with sentiment-specific colour behaviours.

Reference visual target:

![Facial sentiment overlay reference](assets/reference/facial-sentiment-overlay-reference.png)

## Prototype Goal

Build a fast local demo that proves the visitor-facing moment:

1. A live camera feed appears on the primary screen.
2. Face detection locks onto the visitor.
3. Emotion/sentiment labels and translucent bounding boxes appear over the face.
4. The dominant expression is translated into an AI Trail sentiment line.
5. A simulated LED panel or secondary visual state changes colour based on that sentiment.

## Architecture And Models

The prototype is split into a static React frontend and a local Python vision backend.

| Layer | Implementation | Notes |
|---|---|---|
| Frontend | React + Vite + JavaScript/JSX | Runs the camera view, overlay canvas, diagnostics panel, sentiment mapping, and LED mesh simulation. |
| Camera | Browser `getUserMedia` | Uses the local webcam; the default view is mirrored for visitor-facing interaction. |
| Feature placement | Python OpenCV YuNet (`face_detection_yunet_2023mar.onnx`) | Fixed live path. Receives downscaled full-frame JPEGs at `/detect`, detects multiple faces, and returns face boxes plus eye, nose, mouth, and brow landmarks. |
| Emotion analysis | Python OpenCV FER+ (`emotion-ferplus-8.onnx`) | Receives `192x192` face crops at `/analyze`. The default mode is `Python FER+ + YuNet assist`; `Python FER+ raw` remains available as the baseline. |
| Sadness assist | YuNet landmark geometry | Uses crop-relative mouth/eye/nose landmarks to reduce FER+'s neutral bias on downturned-mouth sad expressions. |
| Hosting | Firebase Hosting | Publishes the static frontend at `https://ai-emotion-krd.web.app`. |
| Backend hosting | Local Python service for now | A public remote demo needs the Python backend deployed separately, for example to Cloud Run, then rebuilt with `VITE_BACKEND_URL`. |

Keep local model weights in `/Users/ro/Desktop/KR+D/local-models/` or a `KRD_LOCAL_MODELS_DIR` override. Do not download model binaries into this project folder.

## Files

| Path | Purpose |
|---|---|
| `docs/implementation-plan.md` | Detailed build plan and technical architecture. |
| `docs/proposal-summary.md` | Source-grounded summary of the attached proposal. |
| `DECISIONS.md` | Prototype decisions and constraints. |
| `assets/reference/` | Reference imagery supplied for the overlay treatment. |

## Run Locally

```bash
pnpm install
pnpm dev --port 5178
```

Open `http://127.0.0.1:5178/` for real MacBook camera testing.

Open `http://127.0.0.1:5178/?mode=test` for the deterministic fake camera feed used by Playwright.

For the local backend feature-placement and emotion paths, run the Python service in a second terminal:

```bash
pnpm backend
```

Feature placement is fixed to `Python YuNet multi-face`. The frontend sends a downscaled full-frame JPEG to `http://127.0.0.1:8787/detect`, and the backend returns multiple face boxes plus eye, nose, mouth, and brow landmarks for overlay placement.

For emotion analysis, use the side panel to switch between `Python FER+ + YuNet assist` and `Python FER+ raw`. The frontend sends a small `192x192` JPEG face crop to `http://127.0.0.1:8787/analyze` roughly once every 700ms, and the backend runs the FER+ ONNX model locally through OpenCV DNN.

Set `VITE_BACKEND_URL` when the Python backend is hosted somewhere other than the local workstation:

```bash
VITE_BACKEND_URL=https://your-backend.example.com pnpm build
```

## Firebase Hosting

The Firebase Hosting target is configured for project ID `ai-emotion-krd`, with display name `ai-emotion`. The exact project ID `ai-emotion` was already taken globally.

```bash
pnpm build
pnpm run deploy:firebase
```

Firebase Hosting publishes the static React app from `dist/`. The Python YuNet/FER+ backend is separate from Hosting; for a public web demo, deploy that backend to Cloud Run or Firebase Functions and rebuild with `VITE_BACKEND_URL` set to the deployed backend URL.

## Verification

```bash
pnpm build
pnpm test:e2e
```

Model binaries and generated build output should not be committed. YuNet and FER+ weights are loaded by the Python backend from the shared KR+D model store.

The Playwright suite checks:

- Desktop and kiosk viewport rendering.
- Test camera feed, overlay canvas, sentiment result, diagnostics, and LED simulator.
- Screenshot pixel variance so the stage is not blank.
- Chromium fake-camera boot path with the local Python model path.
- Backend sample generation, backend YuNet multi-face placement, and the two Python emotion modes.

## Prototype Status

Runnable React/Vite prototype with camera feed, sentiment overlay, diagnostics panel, LED simulator, backend YuNet multi-face placement, backend face-crop sampling, a lightweight local Python emotion service, Firebase Hosting config, and Playwright coverage.
