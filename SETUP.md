# Portfolio v2 — one-time setup (≈10 minutes, all in the Vercel dashboard)

After you push this code, Vercel redeploys automatically. Three things then need to be switched on.

## 1. Storage (for the admin page: photo, certificates, offer letters)
Vercel dashboard → your project → **Storage** → **Create Database** → **Blob** → name it anything → **Connect to project** (tick all environments).
This adds `BLOB_READ_WRITE_TOKEN` for you.

## 2. Environment variables
Project → **Settings** → **Environment Variables** → add:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | the password you'll use at `/admin` (10+ characters) |
| `SESSION_SECRET` | any long random text — run `openssl rand -hex 32` in Terminal and paste the result |
| `ANTHROPIC_API_KEY` | key from https://console.anthropic.com → API Keys (powers the chatbot + fit check) |

Then **Deployments → ⋯ → Redeploy** so the variables take effect.

Tip: in the Anthropic console, set a monthly spend limit (e.g. $5) so the chatbot can never surprise you.

## 3. Use it
- Admin page: `https://jitdas.vercel.app/admin`
- Upload your photo, then add offer letters (5 slots marked "to upload" are waiting), and a CV (category **CV**) to turn on the **Download CV** button.
- You can change the password inside the admin page any time.

## Editing text (experience, projects, skills)
Everything the site and the chatbot know about you is in `content.json`. Edit it on GitHub (pencil icon) and Vercel redeploys. The chatbot learns the change automatically.

To show your phone number publicly: in `content.json` set `"phone": "+91…"` and `"showPhone": true`.

## Limits worth knowing
- Uploads are limited to about 3 MB per file (Vercel's request limit).
- Everything uploaded is public. Black out salary, phone numbers and addresses on offer letters first — the admin page has a blackout tool for images.
