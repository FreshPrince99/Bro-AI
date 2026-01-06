import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { UserCoachDO } from './durable-objects/userCoachDO';

export interface Env {
  AI: { run: (model: string, payload: unknown) => Promise<unknown> };
  USER_COACH: DurableObjectNamespace;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_REDIRECT_URI?: string;
  EMAIL_PROVIDER?: string;
  RESEND_API_KEY?: string;
  FROM_EMAIL?: string;
  TO_EMAIL?: string;
  APP_BASE_URL?: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

app.get('/api/health', (c) => c.json({ ok: true, version: 'template' }));

app.post('/api/chat', async (c) => {
  const body = await c.req.json<{ userId?: string; message: string; profile?: unknown }>();
  const userId = body.userId ?? 'demo-user';
  const stub = c.env.USER_COACH.get(c.env.USER_COACH.idFromName(userId));

  await stub.fetch('https://do/user', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile: body.profile }),
  });

  const aiResponse = {
    role: 'assistant',
    content:
      'This is a placeholder response. Connect Workers AI by calling env.AI.run(...) with your prompt and user context.',
  };

  await stub.fetch('https://do/conversation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: body.message, response: aiResponse.content }),
  });

  return c.json({ reply: aiResponse, notes: 'Wire this route up to Workers AI to enable real chat.' });
});

app.post('/api/plan', async (c) => {
  const body = await c.req.json<{ userId?: string }>();
  const userId = body.userId ?? 'demo-user';
  const stub = c.env.USER_COACH.get(c.env.USER_COACH.idFromName(userId));

  const plan = {
    week: 1,
    workouts: [
      { day: 'Monday', focus: 'Push', durationMinutes: 60 },
      { day: 'Wednesday', focus: 'Pull', durationMinutes: 60 },
      { day: 'Friday', focus: 'Legs', durationMinutes: 60 },
    ],
    nutrition: { calories: 2400, proteinGrams: 170, notes: 'Adjust macros after first week.' },
  };

  await stub.fetch('https://do/plan', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan }),
  });

  return c.json({ plan, notes: 'Replace with Workers AI JSON generation using your schema.' });
});

app.get('/api/auth/google', (c) => {
  const redirectUri = c.env.GOOGLE_REDIRECT_URI ?? 'http://127.0.0.1:8787/api/auth/callback';
  const clientId = c.env.GOOGLE_CLIENT_ID ?? 'YOUR_GOOGLE_CLIENT_ID';
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.events');
  url.searchParams.set('access_type', 'offline');

  return c.json({ authUrl: url.toString() });
});

app.get('/api/auth/callback', async (c) => {
  const code = c.req.query('code');
  if (!code) {
    return c.json({ error: 'Missing OAuth code' }, 400);
  }

  // Exchange the code for tokens with Google here. For now we just echo the code.
  return c.json({ receivedCode: code, note: 'Swap this for a token exchange call to Google.' });
});

app.post('/api/calendar/sync', async (c) => {
  const body = await c.req.json<{ userId?: string }>();
  const userId = body.userId ?? 'demo-user';
  const stub = c.env.USER_COACH.get(c.env.USER_COACH.idFromName(userId));

  const mockEventIds = ['evt-demo-1', 'evt-demo-2'];

  await stub.fetch('https://do/calendar', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ eventIds: mockEventIds }),
  });

  return c.json({ eventIds: mockEventIds, notes: 'Replace with Google Calendar API calls using stored tokens.' });
});

app.post('/api/remind', async (c) => {
  const note = 'Send weekly check-in email here using your provider (Resend, MailChannels, etc.).';
  return c.json({ status: 'queued', note });
});

const scheduled = async (_event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
  const remindRequest = new Request('https://worker/api/remind', { method: 'POST' });
  ctx.waitUntil(app.fetch(remindRequest, env, ctx));
};

export { UserCoachDO };
export default { fetch: app.fetch, scheduled };
