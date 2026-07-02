# Mosaic Feedback Wall

A two-page feedback system inspired by live event kiosk displays:

- **`/`** — Submit feedback (dark kiosk-style page with textarea + Send button)
- **`/wall`** — Live mosaic wall showing up to **30 feedback tiles** at once

When the wall is full, new feedback replaces the oldest slot in a circular rotation (slot 1 gets replaced when the 31st item arrives, and so on). All feedback is stored in **Neon Postgres**.

## Stack

- Next.js 16 (App Router)
- Neon Postgres + Drizzle ORM
- Server-Sent Events for live wall updates

## Setup

1. **Install dependencies**

```bash
npm install
```

2. **Create a Neon database**

- Go to [Neon Console](https://console.neon.tech)
- Create a project and copy the connection string

3. **Configure environment**

```bash
cp .env.example .env.local
# Paste your Neon DATABASE_URL into .env.local
```

4. **Push the database schema**

```bash
npm run db:push
```

5. **Run the dev server**

```bash
npm run dev
```

Open:

- Submit page: [http://localhost:3000](http://localhost:3000)
- Wall display: [http://localhost:3000/wall](http://localhost:3000/wall)

## How the wall works

- The wall is a **6×5 grid** (30 slots)
- Submissions fill slots **1 → 30** in order
- After 30 slots are filled, each new submission **replaces the oldest slot** (circular buffer)
- The wall page listens for changes via **SSE** and highlights new/updated tiles

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run db:push` | Push schema to Neon |
| `npm run db:studio` | Open Drizzle Studio |

## Deployment

Deploy to [Vercel](https://vercel.com) and add `DATABASE_URL` as an environment variable. Run `npm run db:push` once against your production database before going live.
