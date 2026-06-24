import { getBackendUrl } from './backend-url.js';

const DEFAULT_SIZE = 192;

export function createFrameSample(video, { width = 640, quality = 0.68 } = {}) {
  if (!video || !video.videoWidth || !video.videoHeight) return null;

  const height = Math.round((video.videoHeight / video.videoWidth) * width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: false });
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, 0, 0, width, height);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64Bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

  return {
    dataUrl,
    bytes: base64Bytes,
    width,
    height,
    originalWidth: video.videoWidth,
    originalHeight: video.videoHeight,
    createdAt: Date.now(),
  };
}

export function createFaceSample(video, face, { size = DEFAULT_SIZE, quality = 0.72 } = {}) {
  if (!video || !face || !video.videoWidth || !video.videoHeight) return null;

  const padding = Math.max(face.width, face.height) * 0.22;
  const sourceX = Math.max(0, face.x - padding);
  const sourceY = Math.max(0, face.y - padding);
  const sourceWidth = Math.min(video.videoWidth - sourceX, face.width + padding * 2);
  const sourceHeight = Math.min(video.videoHeight - sourceY, face.height + padding * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: false });

  context.fillStyle = '#111';
  context.fillRect(0, 0, size, size);
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64Bytes = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

  const toCropPoint = (point) => point ? ({
    x: ((point.x - sourceX) / sourceWidth) * size,
    y: ((point.y - sourceY) / sourceHeight) * size,
  }) : null;

  return {
    dataUrl,
    bytes: base64Bytes,
    width: size,
    height: size,
    source: {
      x: Math.round(sourceX),
      y: Math.round(sourceY),
      width: Math.round(sourceWidth),
      height: Math.round(sourceHeight),
    },
    face: {
      x: ((face.x - sourceX) / sourceWidth) * size,
      y: ((face.y - sourceY) / sourceHeight) * size,
      width: (face.width / sourceWidth) * size,
      height: (face.height / sourceHeight) * size,
      confidence: face.confidence ?? 0,
      landmarks: Object.fromEntries(Object.entries(face.landmarks ?? {}).map(([key, point]) => [key, toCropPoint(point)])),
    },
    createdAt: Date.now(),
  };
}

function scaleFaceToOriginal(face, sample) {
  const scaleX = sample.originalWidth / sample.width;
  const scaleY = sample.originalHeight / sample.height;
  const scalePoint = (point) => point ? ({ x: point.x * scaleX, y: point.y * scaleY }) : null;

  return {
    ...face,
    x: face.x * scaleX,
    y: face.y * scaleY,
    width: face.width * scaleX,
    height: face.height * scaleY,
    landmarks: Object.fromEntries(Object.entries(face.landmarks ?? {}).map(([key, point]) => [key, scalePoint(point)])),
  };
}

export async function sendFrameToBackend(sample, { endpoint = getBackendUrl('/detect') } = {}) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: sample.dataUrl,
      width: sample.width,
      height: sample.height,
      face: sample.face,
      createdAt: sample.createdAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend face detector returned ${response.status}`);
  }

  const result = await response.json();
  return {
    ...result,
    faces: (result.faces ?? []).map((face) => scaleFaceToOriginal(face, sample)),
    latencyMs: Math.round(performance.now() - startedAt),
  };
}

export async function sendFaceSampleToBackend(sample, { endpoint = getBackendUrl('/analyze'), mode = 'ferplus-assisted' } = {}) {
  const startedAt = performance.now();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: sample.dataUrl,
      width: sample.width,
      height: sample.height,
      mode,
      face: sample.face,
      createdAt: sample.createdAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend emotion service returned ${response.status}`);
  }

  const result = await response.json();
  return {
    ...result,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
