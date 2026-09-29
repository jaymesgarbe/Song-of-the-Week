import type { APIRoute } from 'astro';
import { getLatestWeek } from '../lib/weeks';

// Built to /current-week.json. The comments API reads it to reject
// new comments on archived weeks.
export const GET: APIRoute = async () => {
  const latest = await getLatestWeek();
  return new Response(JSON.stringify({ week: latest.data.week }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
