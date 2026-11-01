# Portfolio v2 — setup, 100% free

Everything below costs nothing: Vercel Hobby (hosting + Blob storage) and Google Gemini's free tier. No credit card needed anywhere.

## 1. Storage (photo, certificates, offer letters, text edits)
Vercel → your project → **Storage** → **Create Database** → **Blob** → **Continue** → set access to **Public** (Private will not work) → **Create** → tick **all environments** → **Connect**.
Vercel connects it with a `..._STORE_ID` variable (not a token). That is fine; the site finds it automatically.

## 2. Environment variables (Settings → Environment Variables)

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | the password you log in with (10+ characters) |
| `SESSION_SECRET` | run `openssl rand -hex 32 \| pbcopy` in Terminal, then paste |
| `GEMINI_API_KEY` | FREE key from https://aistudio.google.com/apikey → sign in with Google → **Create API key** (do not enable billing) |

`ANTHROPIC_API_KEY` is optional and paid. Skip it.

## 3. Redeploy (required)
Deployments → **⋯** on the top row → **Redeploy**.

## 4. Use it
1. Open your site, click **🔐 Admin** (or press Ctrl/⌘ + Shift + A) and log in.
2. The toolbar shows green ticks for Password, Storage and AI chatbot. A red ✗ tells you what is missing.
3. In edit mode: click any dashed-outline text, type, press **Enter**. Use **Change photo**, **Add document**, **Contact info**, **Password**, **Log out**.
4. Visitors never see edit controls.

## If the free AI is busy or off
The chatbot never breaks: if Gemini is rate-limited or the key is missing, it answers common questions (projects, certificates, availability, contact) with its built-in free keyword guide and still navigates the page.

## Free-tier things to know
- Gemini free tier has daily/minute limits that Google can change. The chatbot falls back to the built-in guide when the limit is hit.
- On the free Gemini tier, Google may use prompts to improve its products. The chatbot only sees your public portfolio text and visitors' questions; do not put private information in `content.json`.
- Vercel Hobby never bills you. If you ever exceed a limit, that feature pauses for up to 30 days instead of charging.
- Vercel Hobby is for personal, non-commercial use, which a portfolio is.
- Uploads are limited to about 3 MB each. Everything uploaded is public, so black out salary, phone numbers and addresses first.

## Not editable from the site (edit `content.json` on GitHub)
Skills lists, adding or removing whole projects or jobs, certificate icons.
