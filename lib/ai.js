export async function callClaude({ system, messages, max_tokens = 600, model }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('NO_KEY');
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com') + '/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: model || process.env.CHAT_MODEL || 'claude-haiku-5-5', max_tokens, system, messages }),
  });
  if (!r.ok) throw new Error('AI_' + r.status);
  const j = await r.json();
  return (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

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
