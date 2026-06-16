# Cameroon ID Registration Intake

A single-page, mobile-first React app that collects National ID registration
details and, on submit, opens **WhatsApp** with a pre-formatted message sent to
a fixed number — ready to copy field-by-field into the government portal.

Bilingual (English / French), Douala, Cameroon. No backend, no database, no
browser storage — everything runs client-side and form data lives only in React
state.

## Configure your number

The WhatsApp recipient is set in `src/App.jsx` at the top:

```js
const YOUR_WHATSAPP = "237652301400"; // country code, no "+", no spaces
```

Example for a Cameroon number: `237671234567`.

## Run locally

```bash
npm install
npm run dev      # dev server (http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # preview the production build
```

## Deploy to Vercel

The repo includes `vercel.json` so Vercel auto-detects Vite. Two options:

### A. GitHub + Vercel dashboard

```bash
git init && git add -A && git commit -m "Cameroon ID intake form"
gh repo create cameroon-id-intake --public --source=. --push
```

Then go to https://vercel.com/new, import the repo, and click **Deploy**.

### B. Vercel CLI

```bash
npm i -g vercel
vercel          # follow prompts (first run links the project)
vercel --prod   # promote to production
```

## Tech

- React 18 + Vite 5
- Single `src/App.jsx`, styles in `src/index.css`
