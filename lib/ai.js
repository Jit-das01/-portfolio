// AI provider. FREE option first: Google Gemini (free tier, no credit card). Anthropic is optional (paid).
const GEMINI_MODELS = () =>
  [process.env.GEMINI_MODEL, 'gemini-2.5-flash-lite', 'gemini-flash-lite-latest', 'gemini-2.5-flash'].filter(Boolean);

async function callGemini({ system, messages, max_tokens, json }) {
  const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com';
  const contents = messages.map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  let lastErr = new Error('AI_FAIL');
  for (const model of [...new Set(GEMINI_MODELS())]) {
    const generationConfig = { maxOutputTokens: Math.max(max_tokens, 700), temperature: 0.4 };
    if (json) generationConfig.responseMimeType = 'application/json';
    if (/2\.5-flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const r = await fetch(`${base}/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig }),
    });
    if (r.status === 429) throw new Error('RATE');
    if (r.status === 404 || r.status === 400) { lastErr = new Error('AI_' + r.status); continue; } // model retired/renamed: try the next one
    if (!r.ok) throw new Error('AI_' + r.status);
    const j = await r.json();
    const text = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (!text.trim()) { lastErr = new Error('AI_EMPTY'); continue; }
    return text;
  }
  throw lastErr;
}

async function callAnthropic({ system, messages, max_tokens, model }) {
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: model || process.env.CHAT_MODEL || 'claude-haiku-5-5', max_tokens, system, messages }),
  });
  if (!r.ok) throw new Error('AI_' + r.status);
  const j = await r.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export const aiConfigured = () => !!(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);

export async function callAI({ system, messages, max_tokens = 600, model, json = false }) {
  if (process.env.GEMINI_API_KEY) return callGemini({ system, messages, max_tokens, json });
  if (process.env.ANTHROPIC_API_KEY) return callAnthropic({ system, messages, max_tokens, model });
  throw new Error('NO_KEY');
}
export const callClaude = callAI; // old name kept so nothing else breaks

// Compact profile text the model is allowed to answer from.
export function buildKnowledge(c, creds) {
  const L = [];
  L.push(`NAME: ${c.name}. ${c.tagline}. Location: ${c.contact.location}. Status: ${c.status}.`);
  L.push(`SUMMARY: ${c.intro}`);
  L.push('ABOUT: ' + c.about.paragraphs.join(' '));
  L.push('EDUCATION: ' + c.about.education.map((e) => `${e.title} (${e.meta}, ${e.score})`).join('; '));
  L.push('STATS: ' + c.stats.map((s) => `${s.value}${s.suffix} ${s.label}`).join(', '));
  L.push('EXPERIENCE:\n' + c.experience.map((e) => `- ${e.role} @ ${e.org} (${e.period}; ${e.where}): ${e.points.join(' ')}`).join('\n'));
  L.push('PROJECTS:\n' + c.projects.map((p) => `- ${p.title} (${p.kind}; ${p.sub}): ${p.desc} Stack: ${p.stack.join(', ')}.${p.link ? ' Link: ' + p.link.url : ''}`).join('\n'));
  L.push('SKILLS:\n' + c.skills.map((s) => `- ${s.group}: ${s.items.join(', ')}`).join('\n'));
  L.push('AVAILABILITY: ' + c.availability.map((a) => `${a.label}: ${a.value} (${a.sub})`).join('; '));
  L.push(`CONTACT: email ${c.contact.email}; LinkedIn ${c.contact.linkedin}; GitHub ${c.contact.github}.`);
  L.push('CREDENTIALS (id | category | title | issuer | date):\n' + creds.map((x) => `${x.id} | ${x.category} | ${x.title} | ${x.issuer} | ${x.date}${x.file ? ' | file available' : ''}`).join('\n'));
  return L.join('\n\n');
}
