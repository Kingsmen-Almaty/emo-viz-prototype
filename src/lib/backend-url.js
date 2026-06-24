const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8787';

export function getBackendUrl(path) {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || DEFAULT_BACKEND_URL;
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}
