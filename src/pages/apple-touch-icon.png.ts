import type { APIRoute } from 'astro';
import { faviconPng } from '../lib/favicon';

// Icon used when someone adds the site to their phone's home screen
export const GET: APIRoute = async () =>
  new Response(await faviconPng(180, { tile: true }), { headers: { 'Content-Type': 'image/png' } });
