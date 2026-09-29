import { createRemoteJWKSet, jwtVerify } from 'jose';
import { type Env, json, error, parseWeek } from '../../_shared';

// Defense in depth: Cloudflare Access should already block unauthenticated
// requests to /api/admin/*, but we also verify the Access JWT here so the
// route stays locked even if the Access policy is misconfigured or removed.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

async function isAdmin(request: Request, env: Env): Promise<boolean> {
  if (env.DEV_ADMIN_BYPASS === 'true') {
    // Only honored when running locally via `wrangler pages dev`
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  jwks ??= createRemoteJWKSet(new URL(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, { issuer: `https://${env.ACCESS_TEAM_DOMAIN}`, audience: env.ACCESS_AUD });
    return true;
  } catch {
    return false;
  }
}

// GET /api/admin/comments[?week=88] -> all fields, including private_name and hidden comments
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) return error('Not authorized.', 401);

  const week = parseWeek(new URL(request.url).searchParams.get('week'));
  const stmt = week
    ? env.DB.prepare(`SELECT * FROM comments WHERE week = ? ORDER BY created_at DESC LIMIT 500`).bind(week)
    : env.DB.prepare(`SELECT * FROM comments ORDER BY created_at DESC LIMIT 500`);
  const { results } = await stmt.all();
  return json({ comments: results });
};

// PATCH /api/admin/comments { id, status: 'visible' | 'hidden' }
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) return error('Not authorized.', 401);

  const { id, status } = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  if (!Number.isInteger(id) || (status !== 'visible' && status !== 'hidden')) {
    return error('Send { id: number, status: "visible" | "hidden" }.', 400);
  }
  const res = await env.DB.prepare(`UPDATE comments SET status = ? WHERE id = ?`).bind(status, id).run();
  if (!res.meta.changes) return error(`No comment with id ${id}.`, 404);
  return json({ ok: true });
};
