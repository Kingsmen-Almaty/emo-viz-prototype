import React, { forwardRef, useEffect } from 'react';

export const SentimentOverlay = forwardRef(function SentimentOverlay({ videoRef, tracking, sentiment, isTestMode }, ref) {
  useEffect(() => {
    const canvas = ref.current;
    const video = videoRef.current;
    if (!canvas || !video) return undefined;
    const context = canvas.getContext('2d');
    let raf = 0;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(1, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, rect.width, rect.height);
      drawScanFrame(context, rect.width, rect.height, sentiment);

      if (tracking.face) {
        for (const face of (tracking.faces ?? []).slice(1)) {
          drawSecondaryFace(context, rect, video, face, sentiment);
        }
        drawFaceReadings(context, rect, video, tracking.face, sentiment, tracking.confidence);
        if (tracking.held) drawReacquiringCue(context, rect.width, rect.height);
      } else if (isTestMode) {
        drawIdleHints(context, rect.width, rect.height);
      }

      raf = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(raf);
  }, [isTestMode, ref, sentiment, tracking.confidence, tracking.face, tracking.faces, videoRef]);

  return <canvas ref={ref} className="sentimentCanvas" data-testid="sentiment-overlay" aria-hidden="true" />;
});

function scaleFace(rect, video, face) {
  const videoWidth = video.videoWidth || 1280;
  const videoHeight = video.videoHeight || 720;
  const scale = Math.max(rect.width / videoWidth, rect.height / videoHeight);
  const drawnWidth = videoWidth * scale;
  const drawnHeight = videoHeight * scale;
  const offsetX = (rect.width - drawnWidth) / 2;
  const offsetY = (rect.height - drawnHeight) / 2;
  const mirrorX = (x) => rect.width - x;
  const scalePoint = (point) => ({ x: mirrorX(offsetX + point.x * scale), y: offsetY + point.y * scale });
  const right = offsetX + (face.x + face.width) * scale;

  return {
    x: mirrorX(right),
    y: offsetY + face.y * scale,
    width: face.width * scale,
    height: face.height * scale,
    landmarks: Object.fromEntries(Object.entries(face.landmarks ?? {}).map(([key, point]) => [key, scalePoint(point)])),
  };
}

function drawScanFrame(context, width, height, sentiment) {
  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.26)';
  context.lineWidth = 1;
  context.strokeRect(28, 58, width - 56, height - 116);
  context.strokeStyle = `${sentiment.accent}55`;
  context.beginPath();
  context.moveTo(width * 0.08, height * 0.13);
  context.lineTo(width * 0.42, height * 0.13);
  context.moveTo(width * 0.48, height * 0.86);
  context.lineTo(width * 0.92, height * 0.86);
  context.stroke();
  drawRayOrigin(context, width, height, sentiment);
  context.font = '12px "Courier New", monospace';
  context.fillStyle = 'rgba(255,255,255,0.62)';
  context.fillText('live expression vector / sentiment inference', 32, 38);
  context.restore();
}

function drawRayOrigin(context, width, height, sentiment) {
  const origin = getRayOrigin(width, height);
  context.save();
  context.strokeStyle = `${sentiment.accent}88`;
  context.fillStyle = 'rgba(255,255,255,0.6)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(origin.x - 18, origin.y);
  context.lineTo(origin.x + 18, origin.y);
  context.quadraticCurveTo(origin.x + 22, origin.y, origin.x + 22, origin.y + 4);
  context.lineTo(origin.x + 22, origin.y + 7);
  context.lineTo(origin.x - 22, origin.y + 7);
  context.lineTo(origin.x - 22, origin.y + 4);
  context.quadraticCurveTo(origin.x - 22, origin.y, origin.x - 18, origin.y);
  context.stroke();
  context.fillText('origin', origin.x + 30, origin.y + 7);
  context.restore();
}

function getRayOrigin(width, height) {
  return { x: width / 2, y: height - 28 };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getFeatureBox(face, landmark, feature) {
  const faceMin = Math.min(face.width, face.height);
  const specs = {
    leftEye: { width: 0.22, height: 0.1, yOffset: -0.05 },
    rightEye: { width: 0.22, height: 0.1, yOffset: -0.05 },
    brow: { width: 0.42, height: 0.13, yOffset: -0.09 },
    nose: { width: 0.2, height: 0.18, yOffset: -0.05 },
    mouth: { width: 0.38, height: 0.14, yOffset: -0.07 },
  };
  const spec = specs[feature] ?? { width: 0.18, height: 0.12, yOffset: -0.06 };
  const width = clamp(face.width * spec.width, 34, feature === 'mouth' ? 132 : 92);
  const height = clamp(faceMin * spec.height, 20, feature === 'mouth' ? 58 : 44);

  return {
    x: landmark.x - width / 2,
    y: landmark.y + face.height * spec.yOffset,
    width,
    height,
  };
}

function drawFeatureRay(context, origin, box, landmark) {
  const target = {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(target.x, target.y);
  context.stroke();
  context.beginPath();
  context.arc(landmark.x, landmark.y, 2.2, 0, Math.PI * 2);
  context.fill();
}

function drawFaceReadings(context, rect, video, rawFace, sentiment, confidence) {
  const face = scaleFace(rect, video, rawFace);
  const origin = getRayOrigin(rect.width, rect.height);
  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.4)';
  context.fillStyle = 'rgba(255,255,255,0.74)';
  context.lineWidth = 1.2;
  context.font = '13px "Courier New", monospace';
  context.strokeRect(face.x, face.y, face.width, face.height);

  const points = [
    { key: 'leftEye', label: 'left eye' },
    { key: 'rightEye', label: 'right eye' },
    { key: 'brow', label: 'brow' },
    { key: 'nose', label: 'nose' },
    { key: 'mouth', label: 'mouth' },
  ];

  context.strokeStyle = 'rgba(255,255,255,0.34)';
  context.fillStyle = 'rgba(255,255,255,0.76)';
  for (const point of points) {
    const landmark = face.landmarks[point.key];
    if (!landmark) continue;
    const box = getFeatureBox(face, landmark, point.key);
    drawFeatureRay(context, origin, box, landmark);
    context.strokeRect(box.x, box.y, box.width, box.height);
    context.fillText(point.label, box.x + 6, box.y + 17);
  }

  context.fillStyle = sentiment.accent;
  context.fillText(`confidence ${(confidence * 100).toFixed(0)}%`, face.x + face.width + 16, face.y + 24);
  context.restore();
}

function drawSecondaryFace(context, rect, video, rawFace, sentiment) {
  const face = scaleFace(rect, video, rawFace);
  const origin = getRayOrigin(rect.width, rect.height);
  context.save();
  context.strokeStyle = `${sentiment.accent}66`;
  context.fillStyle = 'rgba(255,255,255,0.58)';
  context.lineWidth = 1;
  context.font = '12px "Courier New", monospace';
  context.strokeRect(face.x, face.y, face.width, face.height);
  context.fillText('secondary face', face.x + 8, face.y + 18);

  for (const key of ['leftEye', 'rightEye', 'nose', 'mouth']) {
    const point = face.landmarks[key];
    if (!point) continue;
    const box = getFeatureBox(face, point, key);
    drawFeatureRay(context, origin, box, point);
    context.strokeRect(box.x, box.y, box.width, box.height);
  }
  context.restore();
}

function drawIdleHints(context, width, height) {
  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.18)';
  context.font = '13px "Courier New", monospace';
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.strokeRect(width * 0.36, height * 0.2, width * 0.28, height * 0.54);
  context.fillText('waiting for face lock', width * 0.39, height * 0.24);
  context.restore();
}

function drawReacquiringCue(context, width, height) {
  context.save();
  context.font = '13px "Courier New", monospace';
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.strokeStyle = 'rgba(255,255,255,0.25)';
  context.strokeRect(width - 270, 78, 210, 34);
  context.fillText('reacquiring profile', width - 252, 100);
  context.restore();
}
