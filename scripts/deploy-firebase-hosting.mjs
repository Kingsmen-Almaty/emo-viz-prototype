import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const project = 'ai-emotion-krd';
const site = 'ai-emotion-krd';
const publicDir = path.resolve('dist');
const origin = 'https://firebasehosting.googleapis.com/v1beta1';

function getAccessToken() {
  try {
    return execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(`Could not read gcloud access token: ${error.message}`);
  }
}

function walk(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(dir, entry.name);
    const relativePath = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) return walk(absolutePath, relativePath);
    if (entry.isFile()) return [relativePath];
    return [];
  });
}

async function apiRequest(token, url, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': project,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${method} ${url} failed ${response.status}: ${text.slice(0, 1000)}`);
  }
  return payload;
}

async function main() {
  const token = getAccessToken();
  const files = walk(publicDir);
  console.log(`Deploying ${files.length} files to Firebase Hosting site ${site}`);

  const version = await apiRequest(token, `${origin}/projects/-/sites/${site}/versions`, {
    method: 'POST',
    body: {
      status: 'CREATED',
      labels: { deployment_tool: 'codex-rest' },
    },
  });

  const versionName = version.name;
  const fileData = new Map();
  const populateFiles = {};

  for (const relativePath of files) {
    const raw = fs.readFileSync(path.join(publicDir, relativePath));
    const gzip = zlib.gzipSync(raw, { level: 9 });
    const hash = crypto.createHash('sha256').update(gzip).digest('hex');
    fileData.set(hash, gzip);
    populateFiles[`/${relativePath}`] = hash;
  }

  const populate = await apiRequest(token, `${origin}/${versionName}:populateFiles`, {
    method: 'POST',
    body: { files: populateFiles },
  });

  const uploadRequiredHashes = populate.uploadRequiredHashes || [];
  console.log(`Uploading ${uploadRequiredHashes.length} new file blobs`);
  for (const hash of uploadRequiredHashes) {
    const gzip = fileData.get(hash);
    if (!gzip) throw new Error(`Missing blob for hash ${hash}`);
    const response = await fetch(`${populate.uploadUrl}/${hash}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-goog-user-project': project,
      },
      body: gzip,
    });
    if (!response.ok) {
      throw new Error(`Upload ${hash} failed ${response.status}: ${(await response.text()).slice(0, 1000)}`);
    }
  }

  const versionId = versionName.split('/').pop();
  const finalized = await apiRequest(token, `${origin}/projects/-/sites/${site}/versions/${versionId}?updateMask=status,config`, {
    method: 'PATCH',
    body: {
      status: 'FINALIZED',
      config: {
        rewrites: [{ glob: '**', path: '/index.html' }],
      },
    },
  });

  const release = await apiRequest(token, `${origin}/projects/-/sites/${site}/channels/live/releases?versionName=${encodeURIComponent(versionName)}`, {
    method: 'POST',
    body: { message: 'Deploy AI Trail emotion prototype' },
  });

  console.log(JSON.stringify({
    ok: true,
    project,
    site,
    version: finalized.name,
    release: release.name,
    url: `https://${site}.web.app`,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exit(1);
});
