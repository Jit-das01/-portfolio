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
