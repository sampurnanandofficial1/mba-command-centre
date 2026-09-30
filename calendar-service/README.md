# JARVIS Calendar OAuth Service

Public read-only Google Calendar proxy for the GitHub Pages tracker. Google
authorization is completed once by `pgp41221@iiml.ac.in`; afterwards, calendar
event details are returned directly to the tracker without visitor authentication.

Required Railway variables:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `PUBLIC_BASE_URL` (the Railway service URL)
- `FRONTEND_URL=https://sampurnanandofficial1.github.io/mba-command-centre/`
- `SESSION_SECRET` (random, at least 32 bytes)
- `ENCRYPTION_KEY` (random, at least 32 bytes)
- `ACCESS_CODE` (administrator-only protection for replacing the OAuth connection)
- `CONNECTION_FILE=/data/google-connection.enc`

Attach a persistent Railway volume mounted at `/data`. The encrypted Google
refresh credential is stored there so redeployments do not disconnect Calendar.

Google OAuth redirect URI:

`$PUBLIC_BASE_URL/auth/google/callback`

The frontend never contains the administrator access code, Google client secret,
or refresh credential. The `/api/events` response is intentionally public and
read-only.
