# Bro AI (Cloudflare Workers AI + Durable Objects + Google Calendar)

Workout Coach AI is a lightweight AI agent that:
- chats with you to understand your fitness goals, constraints, and preferences
- generates a weekly workout + nutrition plan (as structured JSON)
- syncs workouts to **Google Calendar**
- sends a **weekly email check-in** to review progress and adjust the plan

This project is built for Cloudflare’s AI app assignment and includes:
- **LLM:** Cloudflare Workers AI (Llama model)
- **Coordination:** Cloudflare Worker (+ optional Workflows)
- **User input:** Chat UI on Cloudflare Pages
- **Memory/state:** Durable Objects (per-user “coach brain”)
- **Reminders:** Cron Trigger that sends weekly email check-ins


## Features

### MVP
- Chat intake (goals, schedule, equipment, dietary preferences)
- Plan generation in strict JSON
- Google OAuth and Calendar event creation
- Durable Object memory (profile + plan + created event IDs)
- Weekly reminder email with a link back to the app

### Nice-to-have (optional)
- Cloudflare Workflows orchestration
- Calendar conflict-aware scheduling
- Plan history and analytics in D1


## Tech Stack

- Cloudflare Pages (frontend)
- Cloudflare Workers (API)
- Cloudflare Workers AI (LLM)
- Durable Objects (state/memory)
- Google Calendar API (events)
- Email provider (Resend/MailChannels/etc.)
- Wrangler (deploy)


## Repo Structure (suggested)

```

workout-coach-ai/
apps/
web/                      # Cloudflare Pages (React or Next.js)
workers/
api/
src/
index.ts              # router
routes/
chat.ts             # /api/chat (LLM + memory)
plan.ts             # /api/plan (structured JSON)
oauth.ts            # /api/auth/google + /callback
calendar.ts         # /api/calendar/sync
remind.ts           # /api/remind (cron)
prompts/
system.txt
plan_prompt.txt
wrangler.toml
durable-objects/
userCoachDO.ts            # stores user profile, plan, event IDs
schema/
plan.schema.json          # JSON schema for plan output
README.md

````


## Prerequisites

- Node.js 18+ (or 20+)
- Cloudflare account + Wrangler installed
- Google Cloud project with OAuth credentials
- A sending email provider (Resend is easiest for demos)


## 1) Google OAuth + Calendar Setup

### Create OAuth credentials
1. Go to Google Cloud Console → APIs & Services
2. Enable **Google Calendar API**
3. Configure OAuth consent screen (External is fine for testing)
4. Create **OAuth Client ID** (Web application)
5. Add authorized redirect URI:

For local dev:
- `http://127.0.0.1:8787/api/auth/callback`

For production:
- `https://<your-worker-domain>/api/auth/callback`

### Required scopes
- `https://www.googleapis.com/auth/calendar.events`


## 2) Local Dev Setup

### Install dependencies
From `workers/api`:
```bash
npm install
````

### Configure secrets / env vars

Create `workers/api/.dev.vars` (for local only):

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://127.0.0.1:8787/api/auth/callback

# Email provider (example: Resend)
EMAIL_PROVIDER=resend
RESEND_API_KEY=...
FROM_EMAIL=coach@yourdomain.com
TO_EMAIL=you@your-email.com

# Optional: base URL of your Pages app for links in emails
APP_BASE_URL=http://localhost:3000
```

> Note: In production, use `wrangler secret put ...` for secrets instead of committing env files.

### Run the worker locally

```bash
npx wrangler dev
```

Worker runs at:

* `http://127.0.0.1:8787`

### Frontend (Pages)

From `apps/web`:

```bash
npm install
npm run dev
```

Frontend at:

* `http://localhost:3000`

## 3) Durable Objects

The Durable Object stores per-user state:

* profile (goals, constraints)
* conversation summary
* last generated plan
* created Google Calendar event IDs
* next check-in schedule metadata

Make sure your `wrangler.toml` includes a DO binding similar to:

```toml
[durable_objects]
bindings = [
  { name = "USER_COACH", class_name = "UserCoachDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["UserCoachDO"]
```

## 4) Workers AI

This project uses Workers AI for:

* intake Q&A
* converting chat -> plan JSON
* weekly check-in questions and plan adjustments

You’ll call `env.AI.run(model, { messages })` in your chat/plan routes.

## 5) API Endpoints

* `POST /api/chat`

  * user message → LLM + memory → assistant response
* `POST /api/plan`

  * generates plan JSON using stored profile + constraints
* `GET /api/auth/google`

  * starts Google OAuth flow
* `GET /api/auth/callback`

  * OAuth callback stores tokens in DO
* `POST /api/calendar/sync`

  * creates calendar events for workouts and saves event IDs
* `POST /api/remind`

  * triggered by cron; sends weekly email check-in

## 6) Weekly Reminders (Cron)

In `wrangler.toml`:

```toml
[triggers]
crons = ["0 9 * * MON"]
```

This runs every Monday at 09:00 UTC and calls your scheduled handler, which should:

* load active users (or in MVP: just one user email)
* generate check-in email content
* send email with link back to the app

## 7) Deployment

### Deploy the Worker

From `workers/api`:

```bash
npx wrangler deploy
```

Set secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put RESEND_API_KEY
```

### Deploy the Pages app

* Connect the repo in Cloudflare Pages
* Set build command and output directory
* Add `APP_BASE_URL` and API base URL as env vars

## Demo Script (2 minutes)

1. Open the web app and start chat: “I want to gain muscle, 4 days/week, evenings”
2. Agent asks 4–6 questions (schedule, equipment, diet prefs)
3. Click “Generate plan” → shows structured plan (workouts + nutrition targets)
4. Click “Sync to Google Calendar” → verify events appear
5. Show weekly reminder email preview and explain check-in loop

## Notes on Safety

This app is not medical advice. It provides general fitness guidance and encourages consulting professionals for injuries/health conditions.
## Local Quickstart

The repo now contains a minimal starter for both the Worker API and the Pages frontend. Secrets stay out of the repo—copy the sample env files and fill them in locally.

### Worker (API + Durable Object + Cron)

```bash
cd workers/api
npm install
cp .dev.vars.example .dev.vars # fill in Google + email keys
npm run dev
```

This runs the Worker at `http://127.0.0.1:8787`. The stub routes are all JSON and write to a `UserCoachDO` Durable Object. Hook up Workers AI, Google OAuth, and Calendar by swapping the placeholder logic in `src/index.ts`.

### Pages frontend (React + Vite)

```bash
cd apps/web
npm install
cp .env.example .env # update the API base URL if needed
npm run dev
```

Visit `http://localhost:3000` to exercise the template. The UI calls `/api/chat` and `/api/plan` and renders the mock responses from the Worker. Adjust `VITE_API_BASE_URL` if you deploy the Worker somewhere else.

### Deployment checklist

- Update `workers/api/wrangler.toml` with your Cloudflare account + Workers AI binding.
- Add the Google OAuth client ID/secret as Wrangler secrets for production.
- Point the Pages environment variables at your Worker base URL so the frontend knows where to fetch.
- Extend `UserCoachDO` if you want to store more history or plan versions.
