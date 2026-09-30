import { createRemoteJWKSet, decodeJwt, jwtVerify } from 'jose';
import { type Env, json, error, parseWeek } from '../../_shared';

// Defense in depth: Cloudflare Access should already block unauthenticated
// requests to /api/admin/*, but we also verify the Access JWT here so the
// route stays locked even if the Access policy is misconfigured or removed.
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** Returns null when authorized, otherwise a reason that's safe to show. */
async function authProblem(request: Request, env: Env): Promise<string | null> {
  if (env.DEV_ADMIN_BYPASS === 'true') {
    // Only honored when running locally via `wrangler pages dev`
    const host = new URL(request.url).hostname;
    return host === 'localhost' || host === '127.0.0.1' ? null : 'Dev bypass only works on localhost.';
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || env.ACCESS_TEAM_DOMAIN.includes('REPLACE') || env.ACCESS_AUD.includes('REPLACE')) {
    return 'Access settings are missing from wrangler.toml on this deployment (ACCESS_TEAM_DOMAIN / ACCESS_AUD).';
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    return 'No Cloudflare Access login on this request. Check that the Access application covers the path api/admin on this domain.';
  }
  // Accept "team", "team.cloudflareaccess.com" or "https://team.cloudflareaccess.com/"
  let team = env.ACCESS_TEAM_DOMAIN.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!team.includes('.')) team = `${team}.cloudflareaccess.com`;
  jwks ??= createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`));
  try {
    await jwtVerify(token, jwks, { issuer: `https://${team}`, audience: env.ACCESS_AUD.trim() });
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/aud/i.test(msg)) return 'Access login found, but ACCESS_AUD does not match this application\'s AUD tag.';
    if (/iss/i.test(msg)) return 'Access login found, but ACCESS_TEAM_DOMAIN does not match your team.';
    let issuer = 'unknown';
    try {
      issuer = String(decodeJwt(token).iss ?? 'unknown');
    } catch {
      /* unreadable token */
    }
    return `Access login could not be verified (${msg}). Team domain used: ${team}. Your login was issued by: ${issuer}`;
  }
}

// GET /api/admin/comments[?week=88] -> all fields, including private_name and hidden comments
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const problem = await authProblem(request, env);
  if (problem) return error(problem, 401);

  const week = parseWeek(new URL(request.url).searchParams.get('week'));
  const stmt = week
    ? env.DB.prepare(`SELECT * FROM comments WHERE week = ? ORDER BY created_at DESC LIMIT 500`).bind(week)
    : env.DB.prepare(`SELECT * FROM comments ORDER BY created_at DESC LIMIT 500`);
  const { results } = await stmt.all();
  return json({ comments: results });
};

// PATCH /api/admin/comments { id, status: 'visible' | 'hidden' }
export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const problem = await authProblem(request, env);
  if (problem) return error(problem, 401);

  const { id, status } = (await request.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  if (!Number.isInteger(id) || (status !== 'visible' && status !== 'hidden')) {
    return error('Send { id: number, status: "visible" | "hidden" }.', 400);
  }
  const res = await env.DB.prepare(`UPDATE comments SET status = ? WHERE id = ?`).bind(status, id).run();
  if (!res.meta.changes) return error(`No comment with id ${id}.`, 404);
  return json({ ok: true });
};
