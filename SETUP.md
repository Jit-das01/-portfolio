# Portfolio v2 — one-time setup (about 10 minutes, all in the Vercel dashboard)

Until these steps are done, the chatbot says "not switched on yet" and photo/document uploads will fail.

## 1. Storage (photo, certificates, offer letters, text edits)
Vercel → your portfolio project → **Storage** → **Create Database** → **Blob** → **Create** → tick **all environments** → **Connect**.

## 2. Environment variables
Project → **Settings** → **Environment Variables** → add all three:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | the password you will log in with (10+ characters) |
| `SESSION_SECRET` | run `openssl rand -hex 32 \| pbcopy` in Terminal, then paste |
| `ANTHROPIC_API_KEY` | from https://console.anthropic.com → API Keys (set a ~$5 monthly limit there) |

## 3. Redeploy (required, or the variables do nothing)
Project → **Deployments** → **⋯** on the top row → **Redeploy**.

## 4. Use it
1. Open your site and click **🔐 Admin** in the top menu (or press Ctrl/⌘ + Shift + A).
2. Log in. The toolbar shows green ticks for Password, Storage and AI chatbot. A red ✗ tells you exactly what is still missing.
3. In edit mode:
   - click any text with a dashed outline, type, press **Enter** (saved instantly)
   - **📷 Change photo** swaps your display photo
   - **+ Add document** or the cards marked "not uploaded yet" add certificates, offer letters, awards and your CV (category **CV** turns on Download CV)
   - **Password** changes your login password; **Log out** ends edit mode
4. Visitors never see any of the edit controls.

## Not editable from the site (edit `content.json` on GitHub instead)
Skills lists, adding or removing whole projects or jobs, and credential icons. Edit the file with the pencil icon on GitHub, and Vercel redeploys.

## Good to know
- Uploads are limited to about 3 MB each.
- Everything uploaded is public. Black out salary, phone numbers and addresses first (the upload dialog has a blackout tool for images; PDFs upload exactly as they are).
- To show your phone publicly, use **Contact info** in edit mode.
