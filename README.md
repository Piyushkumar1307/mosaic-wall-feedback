# Mosaic Feedback Wall

A two-page live feedback system for kiosk + display setups:

- **`/`** — Doodle and send feedback
- **`/wall`** — Live wall with instant updates (no database)

## Stack

- Next.js 16 (App Router)
- In-memory store with instant SSE push
- No database required

## Setup

```bash
npm install
npm run dev
```

Open:

- Submit: [http://localhost:3000](http://localhost:3000)
- Wall: [http://localhost:3000/wall](http://localhost:3000/wall)

Keep `/wall` open on the display, submit from `/` on the kiosk — doodles appear instantly.

## How it works

- Up to **30 doodles** on the wall at once (5×6 grid)
- New submissions **replace the oldest slot** when full
- Wall updates via **Server-Sent Events** pushed immediately on submit (no polling)

## Note

Doodles are stored **in server memory** only. They are cleared when the server restarts or redeploys. Ideal for live events.

## Deploy

Deploy to [Render](https://render.com) or any Node host with `npm run build && npm run start`. No environment variables required.
