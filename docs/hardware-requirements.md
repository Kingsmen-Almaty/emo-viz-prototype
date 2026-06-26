# Emo Viz Production Hardware Requirements

This document defines production-ready hardware for running the Emo Viz local stack on one PC:

- Browser frontend with live camera feed.
- Python OpenCV YuNet/FER+ backend on `127.0.0.1:8787`.
- TouchDesigner on the same PC receiving OSC over UDP, usually `127.0.0.1:9000`.
- Up to 4 detected visitor faces in the camera view, including mixed adult and child heights.

The Python backend is lightweight compared with TouchDesigner. For production, size the PC around TouchDesigner GPU load, camera reliability, output resolution, cooling, and all-day stability.

## Camera Recommendation

Use one production camera for the first install unless the physical space cannot be covered cleanly from a single viewpoint.

One camera is recommended because the current web and backend pipeline expects one live camera stream. A single well-mounted wide-FOV camera avoids duplicate detections, mismatched timestamps, identity confusion, and extra calibration work between two views. YuNet can detect multiple faces from one frame, so the four-person requirement is mainly a camera coverage and image-quality problem, not a camera-count problem.

Use two cameras only if site testing proves one camera cannot cover the interaction zone. Two cameras should be treated as a separate integration scope because the app would need a multi-camera selection or fusion strategy before TouchDesigner receives clean face slots.

### Recommended Camera To Purchase

Recommended camera: AVer CAM130 4K conference camera.

Purchase / product link: https://communication.aver.com/model/cam130

Why this camera fits Emo Viz:

- 4K Sony sensor gives the detector more facial detail before the app downsamples for inference.
- Switchable 90-degree and 120-degree field-of-view modes make it easier to tune the install for adults and children in one frame.
- 120-degree mode gives useful coverage for up to four visitors; 90-degree mode can be used if the interaction zone is tighter and face size matters more than width.
- Built-in intelligent fill lighting can help reduce underexposed faces in museum lighting.
- USB-C / USB 3 connection keeps the installation simpler than HDMI capture or IP-camera ingestion.
- Conference-camera form factor is better suited to rigid mounting than a consumer webcam clipped to a display.

Recommended starting setup:

- Mount one CAM130 centrally above or near the display.
- Start at 4K/30 input if the PC is stable, then downsample in the app/backend path as currently implemented.
- Use 120-degree FOV for first site tests with four people.
- Switch to 90-degree FOV if the faces become too small or lens distortion affects placement.
- Lock exposure/brightness settings after lighting is finalized.

If procurement cannot source the CAM130, use the same selection criteria rather than buying the cheapest 4K webcam: 4K sensor, 90 to 120-degree usable FOV, reliable USB 3 connection, lockable image settings, tripod/wall mounting, and good indoor-light performance.

## Production Camera Spec

| Requirement | Production Baseline |
|---|---|
| Camera count | 1 primary camera, recommended AVer CAM130 |
| Resolution | 4K sensor preferred; 1080p usable only if the interaction zone is close and well lit |
| Output to app | 1080p or 1440p capture recommended for runtime; avoid overloading USB/CPU with unnecessary full 4K processing |
| Frame rate | 30 FPS stable minimum; 60 FPS optional if lighting and USB bandwidth are reliable |
| Field of view | 90 to 120 degrees diagonal as a starting point for 3 to 4 visitors |
| Lens behaviour | Low distortion preferred; avoid extreme fisheye unless calibrated and visually acceptable |
| Focus | Fixed focus or reliable autofocus locked during operation |
| Exposure | Manual or lockable exposure preferred to avoid brightness pulsing |
| Low-light quality | Good indoor performance; avoid noisy webcam output under museum lighting |
| Mount | Rigid mount, not clipped to a loose display edge |
| Connection | USB 3 direct to PC or capture card; avoid shared USB hubs |

### Camera Placement

Target a single interaction zone rather than the full lobby. The camera should see all expected faces clearly while keeping face size large enough for stable feature placement.

| Parameter | Recommended Starting Point |
|---|---|
| Visitor count | Up to 4 faces in one frame |
| Visitor height range | Children and adults, roughly 0.9 m to 1.9 m face height |
| Visitor distance | Approximately 1.5 m to 3.0 m from camera |
| Camera height | Around adult chest to eye level, or slightly above display center angled down |
| Horizontal coverage | Wide enough for 4 shoulder-to-shoulder visitors, but not so wide that faces become tiny |
| Lighting | Even frontal lighting; avoid bright backlight from windows or screens |

If children are expected to stand close to adults, mount and angle the camera so children's faces do not sit at the bottom edge of the frame. A slightly downward angle from above display center is often better than a camera placed too high or too low.

### One Camera vs Two Cameras

| Option | Recommendation | Use When | Avoid When |
|---|---|---|---|
| One wide-FOV camera | Default production path | One defined interaction zone; up to 4 visitors can stand within a guided area; camera can be mounted centrally | The zone is too wide, visitors enter from sharp side angles, or faces become too small |
| Two cameras | Future expansion / site-specific fallback | The installation has two distinct zones, severe occlusion, or adults and children cannot be framed together from one mount | You need a simple first production deployment with one clean set of face slots |

For two cameras, do not simply run two feeds into TouchDesigner without a plan. The system must decide whether to select one active camera, merge detections, or assign separate face-slot ranges per camera. That is additional software and QA scope.

## Production PC Spec

This is the recommended production baseline for one PC running browser, Python backend, and TouchDesigner together.

| Component | Production Baseline |
|---|---|
| OS | Windows 11 Pro, 64-bit, clean install |
| CPU | Modern 8-core high-clock desktop CPU, such as Intel Core i7/i9 or AMD Ryzen 7/9 |
| RAM | 32 GB |
| GPU | NVIDIA RTX-class GPU with at least 8 GB VRAM |
| Preferred GPU tier | RTX 4070-class or better |
| Storage | 1 TB NVMe SSD |
| Camera I/O | Dedicated USB 3 port or dedicated capture card path |
| Display outputs | Dedicated GPU outputs for operator monitor and installation output |
| Network | Wired Gigabit Ethernet |
| Power | UPS-backed power, no battery-only laptop operation |
| Cooling | Desktop/workstation chassis with sustained airflow |

Expected production behaviour:

- Four faces can be detected when they are visible, sufficiently lit, and large enough in frame.
- Browser, Python backend, and TouchDesigner run together without visible contention.
- TouchDesigner holds the required show FPS with the final visual network loaded.
- The PC can run for long rehearsals without thermal throttling or camera dropouts.

## Ideal / Headroom Spec

Use this if TouchDesigner will drive richer generative visuals, higher-resolution outputs, LED processors, projection, multiple outputs, or long public operation.

| Component | Ideal |
|---|---|
| OS | Windows 11 Pro, clean install, updates controlled before show window |
| CPU | 12 to 16 modern high-clock cores |
| RAM | 64 GB |
| GPU | NVIDIA RTX GPU with 12 GB or more VRAM |
| Preferred GPU tier | RTX 4080-class, RTX 4090-class, or RTX workstation card where pro display features are required |
| Storage | 1 TB NVMe SSD minimum; 2 TB preferred if TouchDesigner uses media/cache-heavy scenes |
| Camera I/O | Dedicated USB controller or capture card, not shared with other high-bandwidth peripherals |
| Display outputs | GPU outputs reserved and tested for final monitor/projector/LED processor topology |
| Network | Wired Gigabit Ethernet with static IPs where show-control devices are involved |
| Power | UPS sized for PC, display/control hardware, and graceful shutdown |
| Cooling | Desktop tower or rack workstation with strong airflow and accessible maintenance |

## Software Baseline

| Layer | Requirement |
|---|---|
| Browser | Current Chrome or Edge |
| Node | Project-managed Node environment with `pnpm` |
| Python | Python 3.11+ recommended with `backend/requirements.txt` installed |
| TouchDesigner | Current production build tested against the selected GPU driver |
| GPU driver | Current NVIDIA Studio driver preferred for NVIDIA systems |
| Firewall | Allow local HTTP on `127.0.0.1:8787`; allow UDP OSC on the selected port if TouchDesigner is on another machine |
| Power settings | High performance mode; sleep, display sleep, USB selective suspend, and automatic restarts disabled during show hours |

## TouchDesigner Notes

Derivative's current requirements list Windows 10/11, Vulkan 1.1-capable GPU support, 4 GB VRAM minimum, and 8 GB+ VRAM recommended. For production Emo Viz, treat 8 GB VRAM as the floor and 12 GB+ as preferred headroom.

NVIDIA GPUs are the safest show-machine choice because TouchDesigner workflows, driver tooling, and pro display features are usually strongest there. Integrated graphics are not recommended for production.

For laptop builds, force TouchDesigner to use the discrete GPU in Windows Graphics settings and the NVIDIA Control Panel. However, a desktop or workstation chassis is preferred for thermal stability.

## Local Runtime Topology

```txt
Chrome / Edge camera app
  -> POST http://127.0.0.1:8787/detect
  -> POST http://127.0.0.1:8787/analyze

Python backend
  -> YuNet feature placement
  -> FER+ emotion analysis
  -> OSC UDP /emoViz/... to 127.0.0.1:9000

TouchDesigner
  -> OSC In CHOP, port 9000
  -> Visual / LED / projection output
```

## Production Acceptance Test

Run this checklist on the target PC and camera mount before calling the system hardware-ready:

1. `pnpm dev --port 5178` opens the frontend at `http://127.0.0.1:5178/`.
2. `pnpm backend` returns JSON from `http://127.0.0.1:8787/health`.
3. Camera feed runs for 60 minutes without browser permission prompts, camera disconnects, exposure pulsing, or focus hunting.
4. Four people can stand in the intended interaction zone and all visible faces are detected.
5. Test includes at least one adult, one child-height subject, and mixed heights standing together.
6. Face boxes remain stable at the intended visitor distance and do not jump to background faces or posters.
7. TouchDesigner receives `/emoViz/...` channels through `OSC In CHOP`.
8. TouchDesigner holds target FPS with the final production visual network loaded.
9. CPU, GPU, VRAM, RAM, and disk activity remain within safe sustained ranges during a 2-hour soak test.
10. Windows power mode is set to performance, sleep is disabled, USB selective suspend is disabled, and automatic updates are paused for the show window.
11. Reboot recovery is tested: PC restarts, backend launches, browser launches, TouchDesigner opens, and OSC channels return.

## Not Recommended For Production

- Integrated graphics.
- Battery-powered laptop operation.
- Consumer webcam clipped loosely to a display.
- Extreme fisheye camera without calibration or visual review.
- Shared weak USB hub for camera and other high-bandwidth devices.
- Wi-Fi for show-critical control paths.
- Two-camera deployment without explicit software support for camera selection, face-slot assignment, or detection fusion.
- Treating Cloud Run OSC as a production path. OSC over UDP should stay local or LAN-based.

## Procurement Summary

For the current requirement of detecting up to 4 adult/child faces, procure one AVer CAM130 4K conference camera first and reserve budget/mounting space for a second camera only if site testing proves the interaction zone cannot be covered from one viewpoint.

For the PC, procure a Windows 11 Pro desktop/workstation with an NVIDIA RTX GPU, 32 GB RAM minimum, 1 TB NVMe SSD, direct USB 3 camera input, wired Ethernet, and UPS-backed power. Use 64 GB RAM and a 12 GB+ VRAM GPU if the final TouchDesigner scene or display output becomes visually heavier.

## References

- AVer CAM130 product page: https://communication.aver.com/model/cam130
- AVer CAM130 USA product page: https://www.averusa.com/products/conference-camera/cam130
- Derivative TouchDesigner system requirements: https://derivative.ca/UserGuide/System_Requirements
- Derivative TouchDesigner download requirements summary: https://derivative.ca/download
- Derivative TouchDesigner video server specification guide: https://derivative.ca/UserGuide/TouchDesigner_Video_Server_Specification_Guide
