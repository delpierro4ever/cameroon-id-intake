# ID Registration Service — Setup & Deployment

Three pieces, all on free tiers (Google Sheet + Apps Script + Vercel):

1. **Backend** — one Google Apps Script Web App bound to one Google Sheet.
2. **Form** (repo root) — the public intake form. Sends to WhatsApp **and** saves to the Sheet.
3. **Dashboard** (`dashboard/`) — password-gated app for you + your partner.

The Google Sheet is the **only** permanent store. Everything else holds state in React only.

---

## 1. Backend — Google Sheet + Apps Script

> Do this from your **dedicated business Google account**. Whoever owns this
> account owns the data and the backend. Your partner gets shared access in step 7.

1. Create a **new Google Sheet** (any name, e.g. "ID Registration Data").
2. **Extensions → Apps Script**.
3. Delete the sample `function myFunction()` and paste the entire contents of
   [`apps-script/Code.gs`](apps-script/Code.gs).
4. Save. In the toolbar function dropdown choose **`setupSheets`** and click **Run**.
   Authorize when prompted (it's your own script). This creates the three tabs:
   `Appointments`, `Submissions`, `Registered` with headers.
5. **Deploy → New deployment**. Click the gear → **Web app**.
   - **Description**: anything
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
6. **Deploy**, authorize again if asked, then **copy the Web app URL**
   (ends in `/exec`). This is your `APPS_SCRIPT_URL`.
7. Back in the Sheet, **Share** → add your partner as **Editor**.

> Re-deploying after editing `Code.gs`: use **Deploy → Manage deployments →
> edit (pencil) → Version: New version → Deploy**. The `/exec` URL stays the same.

---

## 2. Form — paste config

In [`src/App.jsx`](src/App.jsx), at the top:

```js
const YOUR_WHATSAPP = "2376XXXXXXXX";   // your number, country code, no + or spaces
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfy.../exec";
```

The form still opens WhatsApp on submit exactly as before; the Sheet save is
best-effort (wrapped in try/catch) so WhatsApp always opens even if the save fails.

## 3. Dashboard — paste config

In [`dashboard/src/App.jsx`](dashboard/src/App.jsx), at the top:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfy.../exec"; // same URL
const DASHBOARD_PASSWORD = "pick-a-shared-password";
```

---

## 4. Push to GitHub

From the repo root:

```bash
git add -A
git commit -m "Add Apps Script backend, Sheet-saving form, and dashboard"
git push origin main
```

---

## 5. Deploy on Vercel (two projects, same repo)

**Project A — the form** (probably already exists):
- Import the repo, **Root Directory** = repo root (`.`), Framework = Vite. Deploy.

**Project B — the dashboard** (new):
- New Project → import the **same** repo.
- **Root Directory** = `dashboard`  ← important.
- Framework = Vite (auto). Deploy.

You'll get two URLs, e.g. `id-form.vercel.app` and `id-dashboard.vercel.app`.

> Both apps read their config from constants in the source, so after editing
> `APPS_SCRIPT_URL` / `YOUR_WHATSAPP` / `DASHBOARD_PASSWORD` you must commit and
> push — Vercel redeploys automatically.

---

## Reminders / gotchas

- **Did you paste the Apps Script URL** into *both* `src/App.jsx` and
  `dashboard/src/App.jsx`? And your **WhatsApp number** into `src/App.jsx`?
- The dashboard password is a light client-side gate (keeps casual visitors out).
  Real protection is keeping the dashboard URL and the Apps Script URL private.
- Only **paid + registered** clients live in the `Registered` tab. Unpaid form
  fills sit in `Submissions` until you Confirm & Register (moves them) or Delete.
- Requests use `Content-Type: text/plain` on purpose — it avoids a CORS preflight
  that Apps Script can't answer. Don't change it to `application/json`.
