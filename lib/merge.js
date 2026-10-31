// Merge default credentials (content.json) with admin overrides/custom entries (blob data).
export function mergeCreds(seeds = [], stored = []) {
  const seedMap = new Map(seeds.map((s) => [s.id, s]));
  const used = new Set();
  const custom = [];
  for (const o of stored) {
    if (seedMap.has(o.id)) {
      used.add(o.id);
      seedMap.set(o.id, { ...seedMap.get(o.id), ...o });
    } else {
      custom.push(o);
    }
  }
  const merged = [...custom, ...seeds.map((s) => seedMap.get(s.id))];
  return merged;
}

// Only what the public should see.
export function publicCreds(all) {
  return all.filter((c) => !c.hidden && (!c.placeholder || c.file));
}

export async function loadContent(req) {
  const host = req.headers.host || 'localhost';
  const proto = /localhost|127\./.test(host) ? 'http' : 'https';
  const r = await fetch(`${proto}://${host}/content.json`);
  if (!r.ok) throw new Error('content.json unavailable');
  return r.json();
}

// ---- Editable text fields (admin edits stored as {path: value}) ----
const FIELD_RE = new RegExp(
  '^(intro|tagline|status|about\\.heading|about\\.paragraphs\\.\\d+' +
  '|stats\\.\\d+\\.(value|label)' +
  '|experience\\.\\d+\\.(role|org|where|period|tag)|experience\\.\\d+\\.points\\.\\d+' +
  '|projects\\.\\d+\\.(title|sub|desc)' +
  '|availability\\.\\d+\\.(label|value|sub)' +
  '|contact\\.(email|linkedin|github|phone|location|showPhone))$'
);
export const validFieldPath = (p) => typeof p === 'string' && p.length < 80 && FIELD_RE.test(p);

// Sets obj[path] = value, keeping the original type (number/boolean/string). Returns false if invalid.
export function setPath(obj, path, val) {
  const k = path.split('.');
  let o = obj;
  for (let i = 0; i < k.length - 1; i++) {
    o = o?.[k[i]];
    if (o == null || typeof o !== 'object') return false;
  }
  const last = k[k.length - 1];
  if (!(last in o)) return false;
  const t = typeof o[last];
  if (t === 'number') {
    const n = Number(val);
    if (!Number.isFinite(n)) return false;
    o[last] = n;
  } else if (t === 'boolean') {
    o[last] = val === true || val === 'true';
  } else {
    o[last] = String(val);
  }
  return true;
}

export function applyFields(content, fields = {}) {
  for (const [p, v] of Object.entries(fields || {})) if (validFieldPath(p)) setPath(content, p, v);
  return content;
}
