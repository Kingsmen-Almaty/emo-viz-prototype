# MacBook Camera Test Guide

## Setup

From this folder:

```bash
pnpm install
pnpm dev --port 5178
```

Open:

```text
http://127.0.0.1:5178/
```

Allow camera access when Chrome or Safari prompts for permission.

`pnpm dev` automatically prepares the local model files before starting Vite.

To test the separate emotion-analysis path, open a second terminal in this folder and run:

```bash
pnpm backend
```

Feature placement is fixed to `Python YuNet multi-face`. This should improve box placement for smaller faces, angled faces, and scenes with more than one person.

Use `Emotion detection option` to compare `Python FER+ + YuNet assist` against `Python FER+ raw`. The side panel should show a `Backend sample` preview with a `192x192` JPEG crop and a backend status such as `18ms`.

## Expected Behaviour

1. Status should show `camera-live`.
2. Status should show `python-local`.
3. The live camera feed should fill the main stage.
4. A face box and diagnostic labels should appear when a person is in frame.
5. After a short hold, the result line should change to a sentiment such as `You seem Curious about the future of AI.`
6. The right-side calculation panel should show expression confidence bars.
7. The diagnostics panel should show the current number of detected faces.
8. The backend sample panel should show a small face crop when a face is tracked.
9. The LED mesh simulator should change colour and pattern with the selected sentiment.

## Recommended Test Conditions

- Test in Chrome first.
- Use a well-lit face, roughly 0.5-1.2 m from the MacBook camera.
- Keep only one face in frame for first validation.
- Try neutral, smile, surprise, frown, and exaggerated concern/fear expressions.
- Press the reset icon between tests if the result feels sticky.
- Press fullscreen for the display-readiness check.

## Troubleshooting

| Symptom | Check |
|---|---|
| `camera-blocked` | Browser camera permission is denied. Re-enable camera permission for `127.0.0.1`. |
| `python-local` does not appear on the real URL | Refresh the page and confirm the frontend is serving the latest build. |
| Feature boxes feel misplaced | The fixed `Python YuNet multi-face` path sends a downscaled full frame to the local Python backend and returns multiple face boxes plus five landmark points per face. |
| No face box | Improve lighting, move closer, or keep only one face in the frame. |
| Side view loses face immediately | The detector now uses rotation-aware face detection and holds the last reliable face briefly. If `reacquiring profile` stays visible for more than 1-2 seconds, ask the visitor to turn slightly back toward the camera or move the camera closer to eye level. |
| Moving backwards loses the face | The detector now allows smaller faces and biases strongly toward the previously tracked visitor. If it still drops, keep the face inside the large scan frame and avoid strong backlight behind the head. |
| Result flickers | Increase smoothing in `src/App.jsx` by raising `windowMs` or `minSamples`. |
| Backend says `offline` | Start `pnpm backend` in a second terminal and confirm `http://127.0.0.1:8787/health` returns JSON. |
| Multiple people are in frame | `Python YuNet multi-face` detects multiple faces; the primary face drives the sentiment result while secondary faces are drawn as additional overlay boxes. |
| Backend result still feels wrong | First verify feature boxes are aligned, then compare `Python FER+ + YuNet assist` with `Python FER+ raw`. Emotion accuracy depends on reliable face and landmark geometry. |
| Slow frame rate | Close other camera apps and test Chrome with hardware acceleration enabled. |

## Privacy Note

The prototype does not record camera frames. `Python YuNet multi-face` sends a downscaled full-frame image to the local machine at `127.0.0.1` for face placement. The Python FER+ emotion modes send only a small `192x192` face crop to the same local backend. Neither path calls a cloud API unless `VITE_BACKEND_URL` is explicitly pointed at a hosted backend.
