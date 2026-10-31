import { readData } from '../lib/store.js';
import { mergeCreds, publicCreds, applyFields, loadContent } from '../lib/merge.js';

// Public: photo, visitor-visible credentials, and text edits made from the site.
export default async function handler(req, res) {
  try {
    const [data, content] = await Promise.all([readData(), loadContent(req)]);
    const credentials = publicCreds(mergeCreds(content.credentials, data.credentials));
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    res.status(200).json({ photo: data.photo || null, credentials, fields: data.fields || {} });
  } catch (e) {
    res.status(200).json({ photo: null, credentials: null, fields: {}, error: 'site-data-unavailable' });
  }
}
