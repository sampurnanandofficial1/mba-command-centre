# J.A.R.V.I.S. MBA Command Centre

A high-tech, dark-themed personal productivity system for MBA tasks, habits, deadlines, analytics, Bhagavad Gita guidance, voice capture, and Google Calendar visibility.

## Live release

- **GitHub Pages:** https://sampurnanandofficial1.github.io/mba-command-centre/
- **Release:** v1.0.0 — GitHub Pages Edition
- **Released:** 23 September 2026

## Latest updates

- Migrated the live frontend to GitHub Pages.
- Removed the ChatGPT Sites runtime dependency from the GitHub release.
- Added browser-based persistence for MASTER TASKS, completion status, editable habits, and 30-day habit history.
- Preserved the single-source-of-truth architecture: tasks are created and edited only in MASTER TASKS; every other view is generated automatically.
- Preserved the JARVIS interface, voice task capture, 365-day Dharma-focused Gita rotation, analytics, archive, and responsive mobile layout.
- Preserved live Google Calendar views through Google Calendar embeds and browser-side Google integration.

## Data model on GitHub Pages

GitHub Pages is static hosting and cannot run a private database server. This release stores task and habit data in the browser's local storage. Data remains on the device and browser profile where it was created. Clearing browser storage removes that device's local tracker data.

## Development

```bash
pnpm install
pnpm run build:github
```

The production-ready static output is generated in `docs/` and is published from the `main` branch through GitHub Pages.

## Core architecture

- `components/task-app.tsx` — application UI and generated views
- `lib/static-api.ts` — GitHub Pages local-storage persistence adapter
- `lib/gita-quotes.ts` — 365-day Dharma-focused verse rotation
- `github-pages/` — static Vite entry point
- `docs/` — deployable GitHub Pages build

## Privacy

No API key, OAuth secret, personal task database, or personal access token is included in the repository. Google OAuth client IDs are public identifiers and, when used, are stored only in the visitor's browser.
