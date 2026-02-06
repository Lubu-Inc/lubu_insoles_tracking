# Insole Tracker

A clean, modern web app to track ~200 smart insoles. Static frontend (no build step) + Google Sheets as the shared backend.

Clone the repo, open `index.html`, and you're up.

---

## Quick Start (3 steps)

### 1. Create the Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet.
2. Rename the first tab to **Insoles** and add this header row:

   | id | serialNumber | type | size | location | pairStatus | notes | dateAdded | dateSent | lastModified |
   |----|-------------|------|------|----------|-----------|-------|-----------|----------|-------------|

3. Create a second tab called **History** with this header row:

   | id | insoleId | timestamp | field | oldValue | newValue |
   |----|---------|-----------|-------|----------|----------|

### 2. Deploy the Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**.
2. Delete any existing code and paste the contents of `apps-script/Code.gs`.
3. Click **Deploy > New deployment**.
4. Set type to **Web app**, execute as **Me**, and access to **Anyone**.
5. Click **Deploy** and copy the URL.

### 3. Configure the frontend

Open `js/api.js` and paste your deployment URL:

```js
BASE_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
```

Open `index.html` in your browser. Done.

---

## File Structure

```
insole_tracking/
├── index.html              # Full SPA — layout + Alpine directives + Tailwind
├── css/
│   └── styles.css          # Animations, scrollbars, print styles
├── js/
│   ├── app.js              # Alpine.js store — state, filtering, sorting, caching
│   ├── api.js              # Google Sheets API client (configure URL here)
│   ├── components.js       # Alpine components — autocomplete, etc.
│   └── utils.js            # Helpers — ID gen, dates, badge colors
├── apps-script/
│   └── Code.gs             # Google Apps Script backend
├── README.md
└── .gitignore
```

---

## Features

- **No build step** — pure HTML, CSS, JS with CDN dependencies (Tailwind, Alpine.js)
- **Google Sheets backend** — shared data, accessible from anywhere
- **Offline support** — localStorage cache for instant loading
- **Sortable/filterable table** — search, type, size, location filters
- **History tracking** — every change is logged with timestamps
- **Responsive** — works on desktop and mobile
- **Beautiful UI** — warm neutrals, amber accents, Inter font, smooth animations

---

## Data Model

### Insoles
| Field | Description |
|-------|-------------|
| id | Auto-generated UUID |
| serialNumber | Optional, 4 alphanumeric chars (e.g. E46B) |
| type | "Core" or "Advanced" |
| size | B (38-39), C (40-41), D (42-43), E (44-45) — customizable in settings |
| location | Person, client, or status (free text) |
| pairStatus | "Both", "Left Only", or "Right Only" — defaults to "Both" |
| notes | Free text |
| dateAdded | ISO timestamp |
| dateSent | ISO timestamp |
| lastModified | ISO timestamp |

### Location Colors
- **Team member** (Ahmed, Luca) — blue badge
- **Client** (Spire, HAUHSU, etc.) — green badge
- **Lost** — red badge
- **Damaged** — orange badge
- **Returned / Stock** — gray badge

---

## Customization

### Manage team members, clients, and sizes

Click the **Settings** button (gear icon) in the top bar to:
- Add/edit/remove team members
- Add/edit/remove clients
- Add/edit/remove sizes

Settings are saved in your browser's localStorage and persist across sessions.

---

## Hosting

| Option | How |
|--------|-----|
| **Local** | `python3 -m http.server 8000` or just open `index.html` |
| **GitHub Pages** | Push repo, enable Pages in Settings |
| **Netlify / Vercel** | Drag-and-drop deploy |
| **S3** | Upload files, enable static website hosting |

---

## Tech Stack

- **Frontend:** HTML + [Tailwind CSS](https://tailwindcss.com) (CDN) + [Alpine.js](https://alpinejs.dev) (CDN)
- **Backend:** Google Sheets + Google Apps Script
- **Cache:** localStorage
