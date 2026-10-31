import {
  readData, writeData, writeConfig, readConfig, hashPassword, checkPassword, issueToken, verifyToken,
  parseDataUrl, put, del, blobReady, rateLimit, clientIp,
} from '../lib/store.js';
import { mergeCreds, loadContent, validFieldPath, setPath } from '../lib/merge.js';

const IMG = ['image/jpeg', 'image/png', 'image/webp'];
const DOC = [...IMG, 'application/pdf'];
const CATS = ['certificate', 'offer', 'letter', 'award', 'cv'];
const clean = (s, n = 200) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? clean(u, 500) : '');

async function removeFile(url) {
  if (url) {
    try { await del(url); } catch { /* already gone */ }
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { action } = body;

  try {
    if (action === 'status') {
      return res.status(200).json({
        configured: { password: !!process.env.ADMIN_PASSWORD, blob: blobReady(), ai: !!process.env.ANTHROPIC_API_KEY },
      });
    }

    if (action === 'login') {
      if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD is not set in Vercel yet.' });
      if (!rateLimit('login:' + clientIp(req), 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many attempts. Try again in a few minutes.' });
      if (!(await checkPassword(String(body.password || '')))) {
        await new Promise((r) => setTimeout(r, 700));
        return res.status(401).json({ error: 'Wrong password.' });
      }
      return res.status(200).json({ token: await issueToken() });
    }

    // Everything below needs a valid session token.
    if (!(await verifyToken(body.token))) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    if (!blobReady()) return res.status(500).json({ error: 'Vercel Blob storage is not connected yet (see SETUP.md step 1).' });

    const data = await readData();

    if (action === 'list') {
      const content = await loadContent(req);
      return res.status(200).json({ photo: data.photo || null, credentials: mergeCreds(content.credentials, data.credentials), fields: data.fields || {} });
    }

    if (action === 'setPhoto') {
      const f = parseDataUrl(body.dataUrl, IMG, 3 * 1024 * 1024);
      const blob = await put(`photo/profile-${Date.now()}.${f.ext}`, f.buf, { access: 'public', contentType: f.mime, addRandomSuffix: true });
      await removeFile(data.photo);
      data.photo = blob.url;
      await writeData(data);
      return res.status(200).json({ ok: true, photo: data.photo });
    }

    if (action === 'resetPhoto') {
      await removeFile(data.photo);
      data.photo = null;
      await writeData(data);
      return res.status(200).json({ ok: true, photo: null });
    }

    if (action === 'saveCredential') {
      const content = await loadContent(req);
      const seeds = content.credentials;
      const incomingId = clean(body.id, 60);
      const isSeed = seeds.some((s) => s.id === incomingId);
      let entry = data.credentials.find((c) => c.id === incomingId);
      const isNew = !entry;
      if (isNew) entry = { id: isSeed ? incomingId : 'c-' + Date.now().toString(36) };

      const fields = {};
      if (body.title !== undefined) fields.title = clean(body.title, 140);
      if (body.issuer !== undefined) fields.issuer = clean(body.issuer, 200);
      if (body.date !== undefined) fields.date = clean(body.date, 60);
      if (body.verifyUrl !== undefined) fields.verifyUrl = safeUrl(body.verifyUrl);
      if (body.category !== undefined) {
        if (!CATS.includes(body.category)) throw new Error('Bad category');
        fields.category = body.category;
      }
      if (!isSeed && isNew && !fields.title) throw new Error('Title is required');
      if (!isSeed && isNew) {
        fields.category = fields.category || 'certificate';
        fields.icon = { certificate: '🎓', offer: '✉️', letter: '📜', award: '🏆', cv: '📄' }[fields.category];
      }
      Object.assign(entry, fields);
      if (!isNew || isSeed) delete entry.hidden;

      if (body.file?.dataUrl) {
        const f = parseDataUrl(body.file.dataUrl, DOC, 3 * 1024 * 1024);
        const blob = await put(`credentials/${entry.id}-${Date.now()}.${f.ext}`, f.buf, { access: 'public', contentType: f.mime, addRandomSuffix: true });
        const merged = mergeCreds(seeds, data.credentials).find((c) => c.id === entry.id);
        await removeFile(merged?.file);
        entry.file = blob.url;
        entry.fileType = f.mime;
      } else if (body.removeFile) {
        const merged = mergeCreds(seeds, data.credentials).find((c) => c.id === entry.id);
        await removeFile(merged?.file);
        entry.file = null;
        entry.fileType = null;
      }

      if (isNew) data.credentials.unshift(entry);
      await writeData(data);
      return res.status(200).json({ ok: true, credentials: mergeCreds(seeds, data.credentials) });
    }

    if (action === 'deleteCredential') {
      const content = await loadContent(req);
      const id = clean(body.id, 60);
      const isSeed = content.credentials.some((s) => s.id === id);
      const merged = mergeCreds(content.credentials, data.credentials).find((c) => c.id === id);
      if (!merged) throw new Error('Not found');
      await removeFile(merged.file);
      data.credentials = data.credentials.filter((c) => c.id !== id);
      if (isSeed) data.credentials.push({ id, hidden: true, file: null, fileType: null });
      await writeData(data);
      return res.status(200).json({ ok: true, credentials: mergeCreds(content.credentials, data.credentials) });
    }

    if (action === 'saveField') {
      const path = body.path;
      if (!validFieldPath(path)) throw new Error('That field cannot be edited.');
      const value = String(body.value ?? '').replace(/\u0000/g, '').slice(0, 1500);
      const content = await loadContent(req);
      if (!setPath(content, path, value)) throw new Error('Invalid value for that field.');
      data.fields = data.fields || {};
      if (Object.keys(data.fields).length >= 300 && !(path in data.fields)) throw new Error('Too many edits — reset text edits first.');
      data.fields[path] = value;
      await writeData(data);
      return res.status(200).json({ ok: true });
    }

    if (action === 'resetFields') {
      data.fields = {};
      await writeData(data);
      return res.status(200).json({ ok: true });
    }

    if (action === 'changePassword') {
      const next = String(body.next || '');
      if (!(await checkPassword(String(body.current || '')))) return res.status(401).json({ error: 'Current password is wrong.' });
      if (next.length < 10) throw new Error('New password must be at least 10 characters.');
      const { salt, hash } = hashPassword(next);
      await writeConfig({ salt, hash, changedAt: new Date().toISOString() });
      return res.status(200).json({ ok: true, token: await issueToken() });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    return res.status(400).json({ error: e.message || 'Something went wrong' });
  }
}
