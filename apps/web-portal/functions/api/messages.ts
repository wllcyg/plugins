interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  run(): Promise<{ meta?: { last_row_id?: number } }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  DB?: D1Database;
  TURNSTILE_SECRET_KEY?: string;
}

interface Context {
  request: Request;
  env: Env;
}

interface GuestbookRow {
  id: number;
  nickname: string;
  plugin_id: string;
  content: string;
  created_at: string;
}

const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store'
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export async function onRequestGet(context: Context): Promise<Response> {
  const { env, request } = context;
  if (!env.DB) {
    return jsonResponse({ messages: [], unconfigured: true });
  }

  const url = new URL(request.url);
  const pluginId = url.searchParams.get('pluginId')?.trim();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 30), 1), 50);

  try {
    const stmt =
      pluginId && pluginId !== 'all'
        ? env.DB.prepare(
            'SELECT id, nickname, plugin_id, content, created_at FROM messages WHERE plugin_id = ? ORDER BY id DESC LIMIT ?'
          ).bind(pluginId, limit)
        : env.DB.prepare(
            'SELECT id, nickname, plugin_id, content, created_at FROM messages ORDER BY id DESC LIMIT ?'
          ).bind(limit);

    const { results = [] } = await stmt.all<GuestbookRow>();
    return jsonResponse({ messages: results, unconfigured: false });
  } catch (err) {
    console.error('Failed to query guestbook messages:', err);
    return jsonResponse({ error: 'Database query failed' }, 500);
  }
}

export async function onRequestPost(context: Context): Promise<Response> {
  const { env, request } = context;
  if (!env.DB) {
    return jsonResponse({ error: 'Guestbook D1 database is not bound yet' }, 503);
  }

  let body: { nickname?: string; pluginId?: string; content?: string; turnstileToken?: string };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const nickname = (body.nickname || '').trim().slice(0, 32) || 'Anonymous';
  const pluginId = (body.pluginId || 'general').trim().replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'general';
  const content = (body.content || '').trim();

  if (content.length < 2 || content.length > 500) {
    return jsonResponse({ error: 'Message content must be between 2 and 500 characters' }, 400);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    if (!body.turnstileToken) {
      return jsonResponse({ error: 'Verification required' }, 400);
    }
    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: body.turnstileToken
      })
    });
    const verifyData = (await verifyRes.json()) as { success?: boolean };
    if (!verifyData.success) {
      return jsonResponse({ error: 'Turnstile verification failed' }, 403);
    }
  }

  try {
    const createdAt = new Date().toISOString();
    const res = await env.DB.prepare(
      'INSERT INTO messages (nickname, plugin_id, content, created_at) VALUES (?, ?, ?, ?)'
    )
      .bind(nickname, pluginId, content, createdAt)
      .run();

    return jsonResponse(
      {
        ok: true,
        message: {
          id: res.meta?.last_row_id ?? Date.now(),
          nickname,
          plugin_id: pluginId,
          content,
          created_at: createdAt
        }
      },
      201
    );
  } catch (err) {
    console.error('Failed to insert guestbook message:', err);
    return jsonResponse({ error: 'Failed to save message' }, 500);
  }
}
