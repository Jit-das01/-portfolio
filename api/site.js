import { readData } from '../lib/store.js';
import { mergeCreds } from '../lib/merge.js';
import { loadContent } from '../lib/merge.js';

// Public: returns photo + merged credentials. Client hides placeholders/hidden items.
export default async function handler(req, res) {
  try {
    const [data, content] = await Promise.all([readData(), loadContent(req)]);
    const credentials = mergeCreds(content.credentials, data.credentials);
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
    res.status(200).json({ photo: data.photo || null, credentials });
  } catch (e) {
    res.status(200).json({ photo: null, credentials: null, error: 'site-data-unavailable' });
  }
}
