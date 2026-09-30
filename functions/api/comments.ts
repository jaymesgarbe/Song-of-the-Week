import { type Env, json, error, sha256Hex, parseWeek, getCurrentWeek } from '../_shared';

const LIMITS = {
  displayName: 40,
  privateName: 80,
  body: 2000,
  // Max comments per hashed IP within the window
  perWindow: 3,
  windowMinutes: 10,
};

// Catches http(s) links, www. links, and bare domains like "spam.xyz/path"
const LINK_RE = /(https?:\/\/|www\.)|\b[a-z0-9-]+\.(com|net|org|io|co|xyz|ru|info|biz|shop|top|site|online|link|ly|me)\b/i;

// Collapse whitespace, strip control characters (keeps newlines in comment bodies)
function clean(value: unknown, keepNewlines = false): string {
  if (typeof value !== 'string') return '';
  let s = value.normalize('NFC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  s = keepNewlines ? s.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  return s.trim();
}

// GET /api/comments?week=88 -> public fields only
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const week = parseWeek(new URL(request.url).searchParams.get('week'));
  if (!week) return error('A valid week number is required.', 400);

  const { results } = await env.DB.prepare(
    `SELECT id, display_name, body, created_at
       FROM comments
      WHERE week = ? AND status = 'visible'
      ORDER BY created_at ASC`,
  )
    .bind(week)
    .all();

  return json({ comments: results }, 200, { 'Cache-Control': 'public, max-age=15' });
};

// POST /api/comments -> create a comment (goes live immediately)
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return error('Request body must be JSON.', 400);
  }

  const week = parseWeek(payload.week);
  if (!week) return error('A valid week number is required.', 400);

  // Only the current week accepts comments; archived weeks are read-only.
  const currentWeek = await getCurrentWeek(request, env);
  if (currentWeek === null) return error("Comments are unavailable right now. Try again in a minute.", 503);
  if (week !== currentWeek) return error('Comments closed when this week was archived.', 403);

  const displayName = clean(payload.display_name) || 'Anonymous';
  const privateName = clean(payload.private_name) || null;
  const body = clean(payload.body, true);

  if (!body) return error('Write a comment before posting.', 400);
  if (body.length > LIMITS.body) return error(`Comments can be up to ${LIMITS.body} characters.`, 400);
  if (displayName.length > LIMITS.displayName) return error(`Names can be up to ${LIMITS.displayName} characters.`, 400);
  if (privateName && privateName.length > LIMITS.privateName) return error(`Real name can be up to ${LIMITS.privateName} characters.`, 400);
  if (LINK_RE.test(body) || LINK_RE.test(displayName)) return error("Links aren't allowed in comments. Remove the link and post again.", 400);

  // 1. Turnstile verification
  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  const token = typeof payload.turnstile_token === 'string' ? payload.turnstile_token : '';
  if (!token) return error('Complete the verification check, then post again.', 400);

  if (!env.TURNSTILE_SECRET) {
    console.error('TURNSTILE_SECRET is not set on this deployment');
    return error('Comments are misconfigured (verification secret missing).', 500);
  }
  let outcome: { success?: boolean; 'error-codes'?: string[]; hostname?: string };
  try {
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET.trim(), response: token, remoteip: ip }),
    });
    outcome = await verify.json();
  } catch {
    return error("Verification service didn't respond. Try again in a minute.", 503);
  }
  if (outcome.success !== true) {
    // Turnstile's error codes are safe to show and say exactly what's wrong,
    // e.g. invalid-input-secret (wrong secret) or invalid-input-response (key mismatch).
    const codes = (outcome['error-codes'] ?? []).join(', ') || 'unknown';
    console.error('Turnstile verification failed:', codes, 'hostname:', outcome.hostname);
    return error(`Verification failed (${codes}). Refresh the page and try again.`, 403);
  }

  // 2. Rate limit by salted IP hash (raw IPs are never stored)
  const ipHash = await sha256Hex(`${env.IP_SALT}:${ip}`);
  const recent = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM comments
      WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`,
  )
    .bind(ipHash, `-${LIMITS.windowMinutes} minutes`)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= LIMITS.perWindow) {
    return error(`You've posted ${LIMITS.perWindow} comments in the last ${LIMITS.windowMinutes} minutes. Wait a few minutes and try again.`, 429);
  }

  // 3. Insert; live immediately
  const comment = await env.DB.prepare(
    `INSERT INTO comments (week, display_name, private_name, body, ip_hash)
     VALUES (?, ?, ?, ?, ?)
     RETURNING id, display_name, body, created_at`,
  )
    .bind(week, displayName, privateName, body, ipHash)
    .first();

  return json({ comment }, 201);
};
