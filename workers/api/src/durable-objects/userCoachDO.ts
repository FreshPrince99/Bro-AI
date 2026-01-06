interface CoachState {
  profile?: unknown;
  conversation: Array<{ role: 'user' | 'assistant'; content: string }>;
  plan?: unknown;
  calendarEventIds: string[];
}

export class UserCoachDO implements DurableObject {
  state: DurableObjectState;
  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const storedState = await this.state.storage.get<CoachState>('state');
    const state: CoachState =
      storedState ?? { profile: undefined, conversation: [], plan: undefined, calendarEventIds: [] };

    if (request.method === 'GET' && url.pathname === '/state') {
      return Response.json(state);
    }

    if (request.method === 'POST' && url.pathname === '/user') {
      const body = await request.json<{ profile?: unknown }>();
      state.profile = body.profile ?? state.profile;
      await this.state.storage.put('state', state);
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/conversation') {
      const body = await request.json<{ message: string; response: string }>();
      state.conversation.push({ role: 'user', content: body.message });
      state.conversation.push({ role: 'assistant', content: body.response });
      await this.state.storage.put('state', state);
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/plan') {
      const body = await request.json<{ plan: unknown }>();
      state.plan = body.plan;
      await this.state.storage.put('state', state);
      return new Response('ok');
    }

    if (request.method === 'POST' && url.pathname === '/calendar') {
      const body = await request.json<{ eventIds: string[] }>();
      state.calendarEventIds = body.eventIds;
      await this.state.storage.put('state', state);
      return new Response('ok');
    }

    return new Response('Not found', { status: 404 });
  }
}
