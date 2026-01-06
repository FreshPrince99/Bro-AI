import { FormEvent, useMemo, useState } from 'react';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8787';

interface ChatResponse {
  reply: { content: string };
  notes?: string;
}

interface PlanResponse {
  plan: {
    workouts: Array<{ day: string; focus: string; durationMinutes: number }>;
    nutrition: { calories: number; proteinGrams: number; notes?: string };
  };
  notes?: string;
}

export default function App() {
  const [message, setMessage] = useState('I want to gain muscle 4x/week.');
  const [chatReply, setChatReply] = useState('');
  const [plan, setPlan] = useState<PlanResponse['plan'] | null>(null);
  const [status, setStatus] = useState('');

  const workerLinks = useMemo(
    () => ({
      chat: `${apiBase}/api/chat`,
      plan: `${apiBase}/api/plan`,
      calendar: `${apiBase}/api/calendar/sync`,
      auth: `${apiBase}/api/auth/google`,
    }),
    [],
  );

  const sendChat = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Sending chat...');

    const res = await fetch(workerLinks.chat, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    const data = (await res.json()) as ChatResponse;
    setChatReply(data.reply.content);
    setStatus(data.notes ?? 'Reply stored in Durable Object.');
  };

  const generatePlan = async () => {
    setStatus('Generating plan...');
    const res = await fetch(workerLinks.plan, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await res.json()) as PlanResponse;
    setPlan(data.plan);
    setStatus(data.notes ?? 'Plan saved in Durable Object.');
  };

  return (
    <div className="app-shell">
      <header>
        <p className="eyebrow">Cloudflare Workers + Pages</p>
        <h1>Workout Coach AI</h1>
        <p className="lede">
          This template wires up a Worker (chat, plan, calendar sync, cron) and a Pages frontend. Add your API keys and replace
          the mocked calls with Workers AI + Google Calendar.
        </p>
        <div className="links">
          <a href={workerLinks.chat} target="_blank" rel="noreferrer">
            /api/chat
          </a>
          <a href={workerLinks.plan} target="_blank" rel="noreferrer">
            /api/plan
          </a>
          <a href={workerLinks.calendar} target="_blank" rel="noreferrer">
            /api/calendar/sync
          </a>
          <a href={workerLinks.auth} target="_blank" rel="noreferrer">
            /api/auth/google
          </a>
        </div>
      </header>

      <main>
        <section className="card">
          <h2>Chat intake</h2>
          <form onSubmit={sendChat} className="stack">
            <label htmlFor="message">Message to your coach</label>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
            <button type="submit">Send to Worker</button>
          </form>
          {chatReply && (
            <div className="reply">
              <p className="label">Assistant reply</p>
              <p>{chatReply}</p>
            </div>
          )}
        </section>

        <section className="card">
          <h2>Generate plan</h2>
          <p>Hits /api/plan (currently mocked) and stores the result in the Durable Object.</p>
          <button onClick={generatePlan}>Generate weekly plan</button>
          {plan && (
            <div className="reply">
              <p className="label">Upcoming workouts</p>
              <ul>
                {plan.workouts.map((workout) => (
                  <li key={workout.day}>
                    <strong>{workout.day}</strong>: {workout.focus} ({workout.durationMinutes} min)
                  </li>
                ))}
              </ul>
              <p className="label">Nutrition</p>
              <p>
                {plan.nutrition.calories} kcal • {plan.nutrition.proteinGrams}g protein
              </p>
              {plan.nutrition.notes && <p>{plan.nutrition.notes}</p>}
            </div>
          )}
        </section>
      </main>

      <footer>
        <p className="status">{status || 'Ready to wire up with real AI + Google APIs.'}</p>
      </footer>
    </div>
  );
}
