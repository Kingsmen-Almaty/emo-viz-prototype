# Emo Viz Prototype Decisions

## 2026-06-23 - Create Prototype Workspace Under CSMA Development

**Decision:** Create `projects/CSMA/04-development/emo-viz-prototype/` as the live planning and prototype workspace for the Emo Viz / AI Wall sentiment interaction.

**Rationale:** The work is an active quick prototype, not a release or handover artefact, so it belongs in `04-development/` under CSMA folder semantics.

## 2026-06-23 - Browser-First Prototype Before Hardware Integration

**Decision:** Start with a browser-based camera prototype using React + Vite, canvas overlays, and a local or browser-capable face/emotion model before adding DMX / Art-Net LED control.

**Rationale:** The proposal's key risk is the live visitor-facing read-and-response moment. A browser prototype can validate camera framing, overlay style, sentiment mapping, and visitor flow quickly before committing to hardware integration.

## 2026-06-23 - Shared Model Store Required

**Decision:** Any downloaded Hugging Face, Gemma, Transformers, or local model files must use `/Users/ro/Desktop/KR+D/local-models/` by default, with `KRD_LOCAL_MODELS_DIR` as the override.

**Rationale:** KR+D's single folder principle keeps prototype folders small, prevents accidental Git commits of model binaries, and allows shared reuse across local AI experiments.

## 2026-06-24 - Lock Feature Placement To Python YuNet

**Decision:** Remove the browser feature-placement options from the live demo UI and lock facial feature placement to the local Python OpenCV YuNet multi-face backend.

**Rationale:** Live testing showed browser-side feature placement was less reliable for far faces, angled faces, and side-to-side movement. YuNet gives the clearest current placement baseline and supports multiple detected faces, so simplifying the UI makes the prototype easier to test and explain.

## 2026-06-24 - Keep Emotion Detection As Python FER+ Modes

**Decision:** Remove the Human and Hugging Face browser emotion options from the UI. Retain two local Python emotion modes: `Python FER+ + YuNet assist` and `Python FER+ raw`.

**Rationale:** Raw FER+ is useful as the model baseline, but it is strongly neutral-biased on some sad expressions. The assisted mode sends crop-relative YuNet landmarks with the face crop so the Python backend can boost sad-mouth geometry when FER+ underreads sadness.

## 2026-06-24 - Publish Static Frontend To Firebase Hosting

**Decision:** Publish the React frontend to Firebase Hosting under project ID `emo-viz`, display name `Emo Viz`, and staging Hosting URL `https://emo-viz.web.app`.

**Rationale:** The requested prototype has been consolidated under the dedicated `emo-viz` project ID. Firebase Hosting serves the static frontend only; the Python YuNet/FER+ backend remains a separate local service until it is deployed to Cloud Run or another backend host and passed to the app via `VITE_BACKEND_URL`.

## 2026-06-24 - Host Public Backend On Cloud Run

**Decision:** Deploy the Python YuNet/FER+ backend to Cloud Run service `emo-viz-backend` in Firebase/GCP project `emo-viz`, region `asia-southeast1`, and rebuild the Firebase frontend with `VITE_BACKEND_URL` pointing to staging API URL `https://emo-viz-backend-n2iej5lfpq-as.a.run.app`.

**Rationale:** Firebase Hosting is static-only. A public web demo needs a reachable HTTPS backend so other users' browsers do not try to call their own `127.0.0.1:8787` loopback address.

## 2026-06-24 - Use Local OSC Over UDP For TouchDesigner

**Decision:** Add optional OSC-over-UDP output to the Python backend, disabled by default and enabled with `OSC_ENABLED=1`. Use normalized `0.0-1.0` feature coordinates and fixed face slots for TouchDesigner `OSC In CHOP` stability.

**Rationale:** TouchDesigner works naturally with OSC/UDP on the local machine or exhibit LAN. Cloud Run cannot directly send UDP packets into an office or exhibit workstation behind NAT, so OSC is an install-side/local-backend integration path while Cloud Run remains the public web backend.

## 2026-06-25 - Consolidate Cloud Resources Under Emo Viz

**Decision:** Migrate Firebase Hosting and Cloud Run from the temporary `ai-emotion-krd` project into the dedicated GCP/Firebase project `emo-viz`, then decommission `ai-emotion-krd`.

**Rationale:** The prototype, repository, service names, and public URLs should consistently use the Emo Viz name. Keeping the temporary project active would create stale URLs and unclear ownership during staging reviews.

## 2026-06-26 - Production Single-Camera Hardware Baseline

**Decision:** For the production hardware recommendation, use one high-quality wide-FOV 4K camera as the default path for detecting up to four adult/child faces, paired with a Windows 11 Pro desktop/workstation, NVIDIA RTX GPU, 32 GB RAM minimum, direct USB 3 camera input, wired Ethernet, and UPS-backed power. Reserve a second camera only as a site-specific fallback if testing proves one camera cannot cover the interaction zone.

**Rationale:** The current browser/backend pipeline expects one live camera stream, and YuNet can detect multiple faces in one frame. A second camera would add integration scope for camera selection, duplicate detection handling, or detection fusion, so it should not be part of the baseline unless the physical install demands it.
