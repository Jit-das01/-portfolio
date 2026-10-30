// Storage + auth helpers. Data lives in Vercel Blob so the admin page can change things without redeploys.
import { put, list, del } from '@vercel/blob';
import crypto from 'node:crypto';

const DATA_PATH = 'site-data.json';
const CFG_PREFIX = 'admin-config/';

export const blobReady = () => !!process.env.BLOB_READ_WRITE_TOKEN;

const emptyData = () => ({ photo: null, credentials: [] });

export async function readData() {
  if (!blobReady()) return emptyData();
  try {
    const { blobs } = await list({ prefix: DATA_PATH, limit: 5 });
    const b = blobs.find((x) => x.pathname === DATA_PATH);
    if (!b) return emptyData();
    const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
    return { ...emptyData(), ...(await r.json()) };
  } catch {
    return emptyData();
  }
}

export async function writeData(data) {
  await put(DATA_PATH, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
}

// Password config is stored under an unguessable (random-suffix) URL, as a salted scrypt hash.
export async function readConfig() {
  if (!blobReady()) return null;
  try {
    const { blobs } = await list({ prefix: CFG_PREFIX, limit: 20 });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
    return await r.json();
  } catch {
    return null;
  }
}

export async function writeConfig(cfg) {
  const { blobs } = await list({ prefix: CFG_PREFIX, limit: 20 });
  await put(CFG_PREFIX + 'config.json', JSON.stringify(cfg), {
    access: 'public',
    addRandomSuffix: true,
    contentType: 'application/json',
    cacheControlMaxAge: 0,
  });
  if (blobs.length) await del(blobs.map((b) => b.url));
}

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(pw, salt, 64, { N: 16384 }).toString('hex');
  return { salt, hash };
}

export function safeEq(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

export async function checkPassword(pw) {
  if (!pw) return false;
  const cfg = await readConfig();
  if (cfg?.hash) {
    const { hash } = hashPassword(pw, cfg.salt);
    return safeEq(hash, cfg.hash);
  }
  const env = process.env.ADMIN_PASSWORD || '';
  return env.length > 0 && safeEq(pw, env);
}

function tokenKey(cfg) {
  return `${process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || ''}|${cfg?.hash || ''}`;
}

export async function issueToken() {
  const cfg = await readConfig();
  const exp = String(Date.now() + 12 * 3600 * 1000);
  const sig = crypto.createHmac('sha256', tokenKey(cfg)).update(exp).digest('hex');
  return `${exp}.${sig}`;
}

export async function verifyToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const cfg = await readConfig();
  const want = crypto.createHmac('sha256', tokenKey(cfg)).update(exp).digest('hex');
  return safeEq(sig, want);
}

export function parseDataUrl(dataUrl, allowed, maxBytes) {
  const m = /^data:([a-z0-9.+/-]+);base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl || '');
  if (!m) throw new Error('Invalid file data');
  const mime = m[1].toLowerCase();
  if (!allowed.includes(mime)) throw new Error('File type not allowed: ' + mime);
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > maxBytes) throw new Error('File too large (max ' + (maxBytes / 1048576).toFixed(1) + ' MB)');
  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' }[mime];
  return { mime, buf, ext };
}

export { put, del };

// Tiny in-memory rate limiter (best effort per serverless instance).
const buckets = new Map();
export function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

export const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
