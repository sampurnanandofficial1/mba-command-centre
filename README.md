# J.A.R.V.I.S. MBA Command Centre

A high-tech, dark-themed personal productivity system for MBA tasks, habits, deadlines, analytics, Bhagavad Gita guidance, voice capture, and Google Calendar visibility.

## Live release

- **GitHub Pages:** https://sampurnanandofficial1.github.io/mba-command-centre/
- **Release:** v1.3.0 — Public Command Centre
- **Released:** 30 September 2026

## Latest updates

- Added an editable daily Time Planner generated from the IIM Lucknow Term V class schedule.
- Integrated the timetable into Today, Weekly View, and the monthly Calendar instead of keeping it as a separate destination.
- Removed the portal password so the command centre opens directly on every browser.
- Added 8–8–8 balance indicators, 15-minute transition protection, meal windows, class-linked self-study demand, case-competition/CFA phases, and visible conflict alerts.
- Algo Investing stays hidden before its configurable post-midterm activation date.
- Migrated the live frontend to GitHub Pages.
- Removed the ChatGPT Sites runtime dependency from the GitHub release.
- Added browser-based persistence for MASTER TASKS, completion status, editable habits, and 30-day habit history.
- Preserved the single-source-of-truth architecture: tasks are created and edited only in MASTER TASKS; every other view is generated automatically.
- Preserved the JARVIS interface, voice task capture, 365-day Dharma-focused Gita rotation, analytics, archive, and responsive mobile layout.
- Added live daily, weekly, and monthly Google Calendar views for `pgp41221@iiml.ac.in`.
- Made read-only Google Calendar views publicly available without a browser access code or Google sign-in.
- Added a Railway OAuth backend with encrypted, persistent calendar credentials and automatic 60-second refresh.
- Restored server-rendered Google Calendar events in Today, Weekly View, and Calendar; the temporary public iframe fallback is no longer used.
- Google authorization remains a one-time administrator operation restricted to `pgp41221@iiml.ac.in`; visitors receive read-only event data directly.

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
- `lib/time-planner.ts` — class recurrence, 8–8–8 allocation, meals, focus phases, and scheduling diagnostics
- `github-pages/` — static Vite entry point
- `docs/` — deployable GitHub Pages build

## Calendar access

No API key, OAuth secret, refresh credential, personal task database, or personal
access token is included in the repository. Calendar event details are public
and read-only. Google authorization and credential replacement remain restricted
to the administrator flow for `pgp41221@iiml.ac.in`.
