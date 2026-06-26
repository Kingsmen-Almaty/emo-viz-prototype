# Emo Viz Production Hardware Requirements

This document defines production-ready hardware for running the Emo Viz local stack on one PC:

- Browser frontend with live camera feed.
- Python OpenCV YuNet/FER+ backend on `127.0.0.1:8787`.
- TouchDesigner on the same PC receiving OSC over UDP, usually `127.0.0.1:9000`, and rendering the production emotion grid / lighting visual.
- 55-inch 4K installation display as shown in the AI Wall setup option.
- Up to 4 detected visitor faces in the camera view, including mixed adult and child heights.

The Python backend is lightweight compared with TouchDesigner. For production, size the PC around TouchDesigner GPU load, camera reliability, 55-inch display output, cooling, and all-day stability. The browser app is not assumed to be the final public emotion-grid renderer; TouchDesigner is the definite production visual layer.

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

- Mount one CAM130 in the camera bay beside the 55-inch display, matching the setup drawing.
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

Target the interaction zone directly in front of the 55-inch display, not the full lobby. The setup drawing shows the camera position in a vertical bay beside the display, facing outward toward the child/adult standing zone. The camera should see all expected faces clearly while keeping face size large enough for stable feature placement.

#### 1-Camera Setup Placement

For the current production baseline, install one active camera in the side camera bay beside the 55-inch display.

Preferred placement:

- Use the upper camera position in the side camera bay if the fabrication provides two camera apertures.
- Aim the camera diagonally outward toward the visitor zone in front of the 55-inch display.
- Set the lens height so the frame captures both the adult face line and child face line shown in the setup drawing.
- Keep the 55-inch display, child silhouette, and adult silhouette zone inside the same camera frame during setup tests.
- If the upper position cuts off child faces, move the camera to the lower bay position or reduce downward tilt before adding a second active camera.

This keeps the installation aligned with the drawing while preserving the current one-feed software pipeline.

| Parameter | Recommended Starting Point |
|---|---|
| Visitor count | Up to 4 faces in one frame |
| Visitor height range | Children and adults, roughly 0.9 m to 1.9 m face height |
| Visitor distance | Approximately 1.5 m to 3.0 m from camera |
| Camera location | In the vertical camera bay immediately beside the 55-inch display, as indicated in the setup option |
| Camera height | Align the active lens around the mid-to-upper visitor face band shown in the drawing: high enough to see adults, low enough that children's faces are not at the frame edge |
| Camera aim | Aim slightly across and outward toward the visitor standing zone in front of the display, not straight down the wall plane |
| Horizontal coverage | Cover the area directly in front of the 55-inch display and adjacent visitor silhouettes, wide enough for 4 visitors without making faces too small |
| Lighting | Even frontal lighting; avoid bright backlight from windows or screens |

The drawing labels `Cameras (2)`, so the wall can reserve two physical camera positions. For the current software baseline, use one active camera feed first. If two apertures are fabricated, leave the unused aperture capped, blanked, or reserved for a spare/alternate-angle camera until multi-camera software support is added.

For mixed adult/child detection, the active camera should be tested with a child standing close to the display and an adult standing slightly to the side, matching the drawing silhouettes. Adjust lens height, tilt, and FOV until both faces sit comfortably inside the same frame with enough margin above adult heads and below child faces.

### One Camera vs Two Cameras

| Option | Recommendation | Use When | Avoid When |
|---|---|---|---|
| One wide-FOV camera | Default production path | One defined interaction zone in front of the 55-inch display; up to 4 visitors can stand within the guided area; camera can be mounted in the side camera bay | The side camera angle cannot see both adult and child faces clearly, or faces become too small |
| Two physical camera positions | Reserve / fallback path | The wall fabrication follows the drawing and can reserve two camera apertures for redundancy, future expansion, or alternate lens height | Both cameras are expected to be active without added software support |
| Two active camera feeds | Future integration scope | Site testing proves one camera cannot cover the visitor zone due to occlusion, sharp angle, or height differences | You need a simple first production deployment with one clean set of face slots |

For two cameras, do not simply run two feeds into TouchDesigner without a plan. The system must decide whether to select one active camera, merge detections, or assign separate face-slot ranges per camera. That is additional software and QA scope.

## Production Display Spec

The AI Wall setup option calls for a 55-inch 4K display. Treat this as a production display requirement, not a consumer-TV placeholder.

| Requirement | Production Baseline |
|---|---|
| Screen size | 55-inch class |
| Resolution | Native 3840 x 2160 4K UHD |
| Panel type | Commercial display or professional signage monitor preferred |
| Orientation | Confirm final content orientation with the physical wall design; support landscape or portrait mounting as required |
| Duty cycle | 16/7 minimum; 24/7 rated display preferred for museum operation |
| Brightness | 500 nits minimum for controlled indoor lighting; 700 nits or higher if the wall has strong ambient light |
| Inputs | HDMI 2.0 minimum for 4K/60; DisplayPort acceptable if supported by the PC/GPU |
| Refresh rate | 60 Hz |
| Bezel | Slim bezel preferred, matte or low-reflection finish preferred |
| Mounting | VESA-compatible mount with service access to inputs, power, and camera/cable routing |
| Control | RS-232, LAN, or reliable IR/service control preferred for power scheduling and support |
| Audio | Not required unless final TouchDesigner content includes sound |

Display placement notes:

- Mount the 55-inch display so adult and child visitors can stand comfortably in front of it without blocking the camera's intended face zone.
- Reserve physical space above or near the display for the camera mount. The camera should not be improvised on a loose display edge.
- Confirm that the 55-inch display's physical dimensions fit the AI Wall drawing and leave enough border space for the camera, printed graphics, LED mesh, and service access.
- Use native 4K output from the PC where possible, then let TouchDesigner scale/render the final visual intentionally rather than relying on display-side scaling.
- Disable consumer display features such as motion smoothing, auto-dimming, eco mode, overscan, and sleep timers.

## Production PC Spec

This is the recommended production baseline for one PC running the camera/browser control surface, Python backend, and TouchDesigner production visual together.

| Component | Production Baseline |
|---|---|
| OS | Windows 11 Pro, 64-bit, clean install |
| CPU | Modern 8-core high-clock desktop CPU, such as Intel Core i7/i9 or AMD Ryzen 7/9 |
| RAM | 32 GB |
| GPU | NVIDIA RTX-class GPU with at least 8 GB VRAM |
| Preferred GPU tier | RTX 4070-class or better |
| Storage | 1 TB NVMe SSD |
| Camera I/O | Dedicated USB 3 port or dedicated capture card path |
| Display outputs | Dedicated GPU outputs for operator monitor and 55-inch 4K installation display |
| Network | Wired Gigabit Ethernet |
| Power | UPS-backed power, no battery-only laptop operation |
| Cooling | Desktop/workstation chassis with sustained airflow |

Expected production behaviour:

- Four faces can be detected when they are visible, sufficiently lit, and large enough in frame.
- Browser/control surface, Python backend, and TouchDesigner run together without visible contention.
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
| Display outputs | GPU outputs reserved and tested for final operator monitor, 55-inch 4K display, projector, or LED processor topology |
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
Chrome / Edge camera/control app
  -> POST http://127.0.0.1:8787/detect
  -> POST http://127.0.0.1:8787/analyze

Python backend
  -> YuNet feature placement
  -> FER+ emotion analysis
  -> OSC UDP /emoViz/... to 127.0.0.1:9000

TouchDesigner
  -> OSC In CHOP, port 9000
  -> Production emotion grid / lighting visual on 55-inch display
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
8. The 55-inch display runs at native 3840 x 2160 and 60 Hz from the production GPU output.
9. TouchDesigner holds target FPS with the final production emotion-grid / lighting network loaded on the 55-inch display.
10. CPU, GPU, VRAM, RAM, and disk activity remain within safe sustained ranges during a 2-hour soak test.
11. Windows power mode is set to performance, sleep is disabled, USB selective suspend is disabled, and automatic updates are paused for the show window.
12. Reboot recovery is tested: PC restarts, backend launches, browser launches, TouchDesigner opens, display output returns at the correct resolution, and OSC channels return.

## Not Recommended For Production

- Integrated graphics.
- Battery-powered laptop operation.
- Consumer webcam clipped loosely to a display.
- Consumer TV as the main public display unless it is approved for the required duty cycle, brightness, mounting, and control needs.
- Extreme fisheye camera without calibration or visual review.
- Shared weak USB hub for camera and other high-bandwidth devices.
- Wi-Fi for show-critical control paths.
- Two-camera deployment without explicit software support for camera selection, face-slot assignment, or detection fusion.
- Treating Cloud Run OSC as a production path. OSC over UDP should stay local or LAN-based.

## Procurement Summary

For the current requirement of detecting up to 4 adult/child faces, procure one AVer CAM130 4K conference camera first and reserve budget/mounting space for a second camera only if site testing proves the interaction zone cannot be covered from one viewpoint.

For the display, procure one 55-inch 4K commercial display or professional signage monitor with 4K/60 input support, VESA mounting, controlled power behaviour, and enough brightness for the AI Wall lighting conditions.

For the PC, procure a Windows 11 Pro desktop/workstation with an NVIDIA RTX GPU, 32 GB RAM minimum, 1 TB NVMe SSD, direct USB 3 camera input, dedicated output to the 55-inch 4K display, wired Ethernet, and UPS-backed power. Use 64 GB RAM and a 12 GB+ VRAM GPU if the final TouchDesigner emotion-grid / lighting scene becomes visually heavier.

## References

- AVer CAM130 product page: https://communication.aver.com/model/cam130
- AVer CAM130 USA product page: https://www.averusa.com/products/conference-camera/cam130
- Derivative TouchDesigner system requirements: https://derivative.ca/UserGuide/System_Requirements
- Derivative TouchDesigner download requirements summary: https://derivative.ca/download
- Derivative TouchDesigner video server specification guide: https://derivative.ca/UserGuide/TouchDesigner_Video_Server_Specification_Guide
