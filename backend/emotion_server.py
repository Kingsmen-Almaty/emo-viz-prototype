#!/usr/bin/env python3
import base64
import copy
import io
import json
import os
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

import cv2
import numpy as np
from PIL import Image

try:
    from pythonosc import udp_client
except ImportError:
    udp_client = None

HOST = os.environ.get("HOST", "127.0.0.1")
PORT = int(os.environ.get("PORT", "8787"))
YUNET_URL = "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx"
FERPLUS_URL = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/emotion_ferplus/model/emotion-ferplus-8.onnx"
DEFAULT_MODEL_DIR = Path("/tmp/krd-local-models" if os.environ.get("K_SERVICE") else "/Users/ro/Desktop/KR+D/local-models")
MODEL_DIR = Path(os.environ.get("KRD_LOCAL_MODELS_DIR", DEFAULT_MODEL_DIR))
YUNET_MODEL = MODEL_DIR / "opencv" / "face_detection_yunet_2023mar.onnx"
FERPLUS_MODEL = MODEL_DIR / "opencv" / "emotion-ferplus-8.onnx"
OSC_ENABLED = os.environ.get("OSC_ENABLED", "0").lower() in {"1", "true", "yes", "on"}
OSC_HOST = os.environ.get("OSC_HOST", "127.0.0.1")
OSC_PORT = int(os.environ.get("OSC_PORT", "9000"))
OSC_PREFIX = "/" + os.environ.get("OSC_PREFIX", "emoViz").strip("/")
OSC_MAX_FACES = int(os.environ.get("OSC_MAX_FACES", "6"))
EMOTION_IDS = {
    "neutral": 0,
    "happy": 1,
    "surprise": 2,
    "sad": 3,
    "fear": 4,
    "angry": 5,
    "disgust": 6,
}
_yunet_detector = None
_emotion_net = None
_osc_client = None
_osc_warned = False
_latest_lock = Lock()
_latest_feature_result = None
_latest_emotion_result = None


def _now_ms():
    return int(time.time() * 1000)


def _set_latest(kind, payload):
    global _latest_feature_result, _latest_emotion_result
    cached = {
        "ok": True,
        "status": "ready",
        "updatedAt": _now_ms(),
        **payload,
    }
    with _latest_lock:
        if kind == "feature":
            _latest_feature_result = cached
        if kind == "emotion":
            _latest_emotion_result = cached
    return cached


def _get_latest(kind):
    with _latest_lock:
        cached = _latest_feature_result if kind == "feature" else _latest_emotion_result
        if cached:
            return copy.deepcopy(cached)

    if kind == "feature":
        return {
            "ok": True,
            "status": "empty",
            "engine": "opencv-yunet",
            "faces": [],
            "frame": None,
            "updatedAt": None,
        }

    return {
        "ok": True,
        "status": "empty",
        "engine": "opencv-ferplus",
        "expressions": {},
        "metrics": None,
        "updatedAt": None,
    }


def _get_osc_client():
    global _osc_client, _osc_warned
    if not OSC_ENABLED:
        return None
    if udp_client is None:
        if not _osc_warned:
            print("[emotion-backend] OSC disabled: python-osc is not installed")
            _osc_warned = True
        return None
    if _osc_client is None:
        _osc_client = udp_client.SimpleUDPClient(OSC_HOST, OSC_PORT)
        print(f"[emotion-backend] OSC enabled: sending UDP to {OSC_HOST}:{OSC_PORT} with prefix {OSC_PREFIX}")
    return _osc_client


def _osc_address(*parts):
    return "/".join([OSC_PREFIX.rstrip("/"), *[str(part).strip("/") for part in parts]])


def _send_osc(path, value):
    global _osc_warned
    client = _get_osc_client()
    if not client:
        return
    try:
        client.send_message(path, float(value))
    except Exception as exc:
        if not _osc_warned:
            print(f"[emotion-backend] OSC send failed: {exc}")
            _osc_warned = True


def _normalise_coordinate(value, size):
    return max(0.0, min(1.0, float(value) / float(size or 1)))


def _dominant_expression(expressions):
    if not expressions:
        return "neutral", 0.0
    name, score = max(expressions.items(), key=lambda item: item[1])
    return name, float(score)


def _send_feature_osc(result):
    frame = result.get("frame") or {}
    frame_width = frame.get("width") or 1
    frame_height = frame.get("height") or 1
    faces = result.get("faces") or []
    active_faces = min(len(faces), OSC_MAX_FACES)

    _send_osc(_osc_address("status", "active"), 1 if active_faces else 0)
    _send_osc(_osc_address("status", "faces"), active_faces)
    _send_osc(_osc_address("status", "timestamp"), (result.get("updatedAt") or _now_ms()) / 1000)

    for index in range(OSC_MAX_FACES):
        face = faces[index] if index < len(faces) else None
        base = ("face", index)
        _send_osc(_osc_address(*base, "active"), 1 if face else 0)
        if not face:
            _send_osc(_osc_address(*base, "confidence"), 0)
            for key in ("x", "y", "w", "h"):
                _send_osc(_osc_address(*base, "box", key), 0)
            for landmark in ("leftEye", "rightEye", "nose", "mouth", "brow", "leftMouth", "rightMouth"):
                _send_osc(_osc_address(*base, "landmark", landmark, "x"), 0)
                _send_osc(_osc_address(*base, "landmark", landmark, "y"), 0)
            continue

        _send_osc(_osc_address(*base, "confidence"), face.get("confidence", 0))
        _send_osc(_osc_address(*base, "box", "x"), _normalise_coordinate(face.get("x", 0), frame_width))
        _send_osc(_osc_address(*base, "box", "y"), _normalise_coordinate(face.get("y", 0), frame_height))
        _send_osc(_osc_address(*base, "box", "w"), _normalise_coordinate(face.get("width", 0), frame_width))
        _send_osc(_osc_address(*base, "box", "h"), _normalise_coordinate(face.get("height", 0), frame_height))

        for name, point in (face.get("landmarks") or {}).items():
            _send_osc(_osc_address(*base, "landmark", name, "x"), _normalise_coordinate(point.get("x", 0), frame_width))
            _send_osc(_osc_address(*base, "landmark", name, "y"), _normalise_coordinate(point.get("y", 0), frame_height))


def _send_emotion_osc(result):
    expressions = result.get("expressions") or {}
    dominant_name, dominant_score = _dominant_expression(expressions)
    base = ("face", 0)

    _send_osc(_osc_address("status", "timestamp"), (result.get("updatedAt") or _now_ms()) / 1000)
    _send_osc(_osc_address(*base, "emotion", "dominantId"), EMOTION_IDS.get(dominant_name, 0))
    _send_osc(_osc_address(*base, "emotion", "confidence"), dominant_score)
    for name in EMOTION_IDS:
        _send_osc(_osc_address(*base, "emotion", name), expressions.get(name, 0))

    raw = ((result.get("metrics") or {}).get("raw") or {})
    for name, value in raw.items():
        _send_osc(_osc_address(*base, "emotion", "raw", name), value)


def _normalise(scores):
    total = sum(max(0.0, value) for value in scores.values()) or 1.0
    return {key: round(max(0.0, value) / total, 4) for key, value in scores.items()}


def _decode_data_url(data_url):
    payload = data_url.split(",", 1)[1] if "," in data_url else data_url
    raw = base64.b64decode(payload)
    image = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(image)


def _ensure_yunet_model():
    YUNET_MODEL.parent.mkdir(parents=True, exist_ok=True)
    if YUNET_MODEL.exists():
        return YUNET_MODEL

    print(f"[emotion-backend] downloading YuNet face model to {YUNET_MODEL}")
    urllib.request.urlretrieve(YUNET_URL, YUNET_MODEL)
    return YUNET_MODEL


def _ensure_ferplus_model():
    FERPLUS_MODEL.parent.mkdir(parents=True, exist_ok=True)
    if FERPLUS_MODEL.exists():
        return FERPLUS_MODEL

    print(f"[emotion-backend] downloading FER+ emotion model to {FERPLUS_MODEL}")
    urllib.request.urlretrieve(FERPLUS_URL, FERPLUS_MODEL)
    return FERPLUS_MODEL


def _get_yunet_detector(width, height):
    global _yunet_detector
    if not hasattr(cv2, "FaceDetectorYN_create"):
        raise RuntimeError("OpenCV FaceDetectorYN is unavailable in this Python environment")

    model = _ensure_yunet_model()
    if _yunet_detector is None:
        _yunet_detector = cv2.FaceDetectorYN_create(
            str(model),
            "",
            (width, height),
            0.32,
            0.3,
            5000,
        )
    else:
        _yunet_detector.setInputSize((width, height))
    return _yunet_detector


def _get_emotion_net():
    global _emotion_net
    if _emotion_net is None:
        model = _ensure_ferplus_model()
        _emotion_net = cv2.dnn.readNetFromONNX(str(model))
    return _emotion_net


def _point(x, y):
    return {"x": round(float(x), 2), "y": round(float(y), 2)}


def detect_faces(image):
    height, width = image.shape[:2]
    bgr = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    detector = _get_yunet_detector(width, height)
    _status, detections = detector.detect(bgr)
    if detections is None:
        return []

    faces = []
    for index, row in enumerate(detections):
        x, y, face_width, face_height = [float(value) for value in row[:4]]
        right_eye = _point(row[4], row[5])
        left_eye = _point(row[6], row[7])
        nose = _point(row[8], row[9])
        right_mouth = _point(row[10], row[11])
        left_mouth = _point(row[12], row[13])
        score = float(row[14])
        mouth = _point((right_mouth["x"] + left_mouth["x"]) / 2, (right_mouth["y"] + left_mouth["y"]) / 2)
        brow = _point(
            (right_eye["x"] + left_eye["x"]) / 2,
            min(right_eye["y"], left_eye["y"]) - face_height * 0.12,
        )

        faces.append({
            "id": f"yunet-{index}",
            "x": round(max(0.0, x), 2),
            "y": round(max(0.0, y), 2),
            "width": round(min(face_width, width - max(0.0, x)), 2),
            "height": round(min(face_height, height - max(0.0, y)), 2),
            "confidence": round(score, 4),
            "landmarks": {
                "leftEye": left_eye,
                "rightEye": right_eye,
                "nose": nose,
                "mouth": mouth,
                "brow": brow,
                "leftMouth": left_mouth,
                "rightMouth": right_mouth,
            },
        })

    return sorted(faces, key=lambda face: face["confidence"], reverse=True)


def _softmax(values):
    values = values.astype(np.float32)
    values = values - np.max(values)
    exp = np.exp(values)
    return exp / (np.sum(exp) or 1.0)


def _get_landmarks_hint(payload):
    landmarks = (payload.get("face") or {}).get("landmarks") or {}
    required = ["leftEye", "rightEye", "nose", "mouth", "leftMouth", "rightMouth"]
    if all(isinstance(landmarks.get(key), dict) for key in required):
        return landmarks
    return None


def _mouth_geometry_assist(image, landmarks):
    if not landmarks:
        return {}

    height, width = image.shape[:2]
    left_mouth = landmarks["leftMouth"]
    right_mouth = landmarks["rightMouth"]
    mouth = landmarks["mouth"]
    nose = landmarks["nose"]
    left_eye = landmarks["leftEye"]
    right_eye = landmarks["rightEye"]

    eye_distance = max(1.0, float(np.hypot(right_eye["x"] - left_eye["x"], right_eye["y"] - left_eye["y"])))
    mouth_width = max(1.0, float(np.hypot(right_mouth["x"] - left_mouth["x"], right_mouth["y"] - left_mouth["y"])))
    mouth_to_nose = float(mouth["y"] - nose["y"])
    mouth_width_ratio = mouth_width / eye_distance
    mouth_drop_ratio = mouth_to_nose / eye_distance

    x1 = int(max(0, min(left_mouth["x"], right_mouth["x"]) - mouth_width * 0.28))
    x2 = int(min(width, max(left_mouth["x"], right_mouth["x"]) + mouth_width * 0.28))
    y1 = int(max(0, mouth["y"] - eye_distance * 0.18))
    y2 = int(min(height, mouth["y"] + eye_distance * 0.34))
    if x2 <= x1 or y2 <= y1:
        return {}

    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    mouth_region = gray[y1:y2, x1:x2]
    dark_ratio = float(np.mean(mouth_region < 92))
    vertical_edges = cv2.Sobel(mouth_region, cv2.CV_32F, 0, 1, ksize=3)
    edge_strength = float(np.mean(np.abs(vertical_edges)) / 255)

    narrow_mouth = max(0.0, min(1.0, (1.42 - mouth_width_ratio) / 0.62))
    dropped_mouth = max(0.0, min(1.0, (mouth_drop_ratio - 0.98) / 0.58))
    compressed_dark_mouth = max(0.0, min(1.0, dark_ratio * 5.5 + edge_strength * 0.9))
    sad_assist = max(0.0, min(0.86, narrow_mouth * 0.38 + dropped_mouth * 0.34 + compressed_dark_mouth * 0.28))

    return {
        "sadAssist": round(sad_assist, 4),
        "mouthWidthRatio": round(mouth_width_ratio, 4),
        "mouthDropRatio": round(mouth_drop_ratio, 4),
        "mouthDarkRatio": round(dark_ratio, 4),
        "mouthEdge": round(edge_strength, 4),
    }


def analyse_expression(image, payload=None):
    payload = payload or {}
    mode = payload.get("mode") or "ferplus-assisted"
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    gray = cv2.equalizeHist(gray)
    resized = cv2.resize(gray, (64, 64), interpolation=cv2.INTER_AREA).astype(np.float32)
    blob = resized.reshape(1, 1, 64, 64)
    net = _get_emotion_net()
    net.setInput(blob)
    logits = net.forward().reshape(-1)
    scores = _softmax(logits)

    # FER+ classes: neutral, happiness, surprise, sadness, anger, disgust, fear, contempt.
    expressions = {
        "neutral": float(scores[0]),
        "happy": float(scores[1]),
        "surprise": float(scores[2]),
        "sad": float(scores[3]),
        "angry": float(scores[4]),
        "disgust": float(scores[5] + scores[7] * 0.55),
        "fear": float(scores[6]),
    }
    assist = _mouth_geometry_assist(image, _get_landmarks_hint(payload))
    sad_assist = assist.get("sadAssist", 0) if mode == "ferplus-assisted" else 0
    if mode == "ferplus-assisted" and sad_assist >= 0.18:
        expressions["sad"] = max(expressions["sad"], 0.28 + sad_assist * 0.95)
        expressions["neutral"] *= 1 - sad_assist * 0.9
        expressions["happy"] *= 1 - sad_assist * 0.78
        expressions["angry"] *= 1 - sad_assist * 0.46
        expressions["fear"] *= 1 - sad_assist * 0.28

    return _normalise(expressions), {
        "model": "emotion-ferplus-8",
        "mode": mode,
        "input": "64x64-grayscale",
        **assist,
        "raw": {
            "neutral": round(float(scores[0]), 4),
            "happiness": round(float(scores[1]), 4),
            "surprise": round(float(scores[2]), 4),
            "sadness": round(float(scores[3]), 4),
            "anger": round(float(scores[4]), 4),
            "disgust": round(float(scores[5]), 4),
            "fear": round(float(scores[6]), 4),
            "contempt": round(float(scores[7]), 4),
        },
    }


class EmotionHandler(BaseHTTPRequestHandler):
    def _send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send_json(200, {"ok": True})

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/health":
            self._send_json(200, {
                "ok": True,
                "engine": "opencv-local-backend",
                "featureDetector": "opencv-yunet",
                "emotionDetector": "opencv-ferplus",
                "cloudRun": bool(os.environ.get("K_SERVICE")),
                "modelPath": str(YUNET_MODEL),
                "modelReady": YUNET_MODEL.exists(),
                "emotionModelPath": str(FERPLUS_MODEL),
                "emotionModelReady": FERPLUS_MODEL.exists(),
                "osc": {
                    "enabled": OSC_ENABLED,
                    "host": OSC_HOST,
                    "port": OSC_PORT,
                    "prefix": OSC_PREFIX,
                    "maxFaces": OSC_MAX_FACES,
                    "available": udp_client is not None,
                },
                "endpoints": {
                    "featurePlacement": {
                        "latest": "GET /feature-placement",
                        "analyzeFrame": "POST /detect",
                    },
                    "emotion": {
                        "latest": "GET /emotion",
                        "analyzeCrop": "POST /analyze",
                    },
                },
            })
            return
        if path == "/feature-placement":
            self._send_json(200, _get_latest("feature"))
            return
        if path == "/emotion":
            self._send_json(200, _get_latest("emotion"))
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path == "/detect":
            try:
                length = int(self.headers.get("Content-Length", "0"))
                payload = json.loads(self.rfile.read(length).decode("utf-8"))
                image = _decode_data_url(payload["image"])
                faces = detect_faces(image)
                result = _set_latest("feature", {
                    "engine": "opencv-yunet",
                    "faces": faces,
                    "frame": {
                        "width": image.shape[1],
                        "height": image.shape[0],
                    },
                })
                _send_feature_osc(result)
                self._send_json(200, result)
            except Exception as exc:
                self._send_json(500, {"error": str(exc)})
            return

        if self.path != "/analyze":
            self._send_json(404, {"error": "not found"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            image = _decode_data_url(payload["image"])
            expressions, metrics = analyse_expression(image, payload)
            result = _set_latest("emotion", {
                "engine": "opencv-ferplus-yunet-assist" if metrics.get("mode") == "ferplus-assisted" else "opencv-ferplus-raw",
                "expressions": expressions,
                "metrics": metrics,
            })
            _send_emotion_osc(result)
            self._send_json(200, result)
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def log_message(self, fmt, *args):
        print(f"[emotion-backend] {self.address_string()} {fmt % args}")


def main():
    server = ThreadingHTTPServer((HOST, PORT), EmotionHandler)
    print(f"Emotion backend listening on http://{HOST}:{PORT}")
    print(f"OSC over UDP {'enabled' if OSC_ENABLED else 'disabled'} ({OSC_HOST}:{OSC_PORT}, prefix {OSC_PREFIX})")
    print("GET /feature-placement returns the latest POST /detect result")
    print("GET /emotion returns the latest POST /analyze result")
    print("POST /detect with JSON { image: fullFrameDataUrl, width, height }")
    print("POST /analyze with JSON { image: faceCropDataUrl, width, height }")
    server.serve_forever()


if __name__ == "__main__":
    main()
