export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TURNSTILE_SECRET: string;
  IP_SALT: string;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  DEV_ADMIN_BYPASS?: string;
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function error(message: string, status: number): Response {
  return json({ error: message }, status);
}

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function parseWeek(raw: unknown): number | null {
  const n = typeof raw === 'string' ? Number(raw) : raw;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 100000 ? n : null;
}

/** The week currently accepting comments, from the built /current-week.json. */
export async function getCurrentWeek(request: Request, env: Env): Promise<number | null> {
  try {
    const res = await env.ASSETS.fetch(new URL('/current-week.json', request.url));
    if (!res.ok) return null;
    return parseWeek(((await res.json()) as { week?: unknown }).week);
  } catch {
    return null;
  }
}
