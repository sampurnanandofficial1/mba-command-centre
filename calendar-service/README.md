# JARVIS Calendar OAuth Service

Public read-only Google Calendar proxy for the GitHub Pages tracker. Google
authorization is completed once by `pgp41221@iiml.ac.in`; afterwards, calendar
event details are returned directly to the tracker without visitor authentication.

## Hosting

- **Runtime:** Google Cloud Run
- **Region:** `asia-south1`
- **Frontend:** `https://sampurnanandofficial1.github.io/mba-command-centre/`
- **Connection storage:** Google Cloud Storage object, encrypted before writing
- **OAuth redirect URI:** `https://mba-calendar-api-aczjpccpla-el.a.run.app/auth/google/callback`

## Required Cloud Run environment variables

- `GOOGLE_CLIENT_ID` — from Secret Manager
- `GOOGLE_CLIENT_SECRET` — from Secret Manager
- `PUBLIC_BASE_URL=https://mba-calendar-api-aczjpccpla-el.a.run.app`
- `FRONTEND_URL=https://sampurnanandofficial1.github.io/mba-command-centre/`
- `SESSION_SECRET` — from Secret Manager
- `ENCRYPTION_KEY` — from Secret Manager
- `ACCESS_CODE` — from Secret Manager
- `CONNECTION_BUCKET=mba-calendar-connection-mba-tracker-708b8-10c69e`
- `CONNECTION_OBJECT=google-connection.enc`

The Cloud Run runtime service account needs object read/write access to the
connection bucket. The frontend never contains the administrator access code,
Google client secret, or refresh credential. The `/api/events` response is
intentionally public and read-only.

## Local development

For local development only, omit `CONNECTION_BUCKET` to use
`CONNECTION_FILE` (defaults to `/data/google-connection.enc`). Production
Cloud Run deployments should use Google Cloud Storage so credentials survive
instance replacement and redeployment.
