// Turn the Spotify/YouTube share URLs you paste into week files into embed IDs.

/** open.spotify.com/track/ID, /album/ID, /playlist/ID (with optional /intl-xx/ and ?si=...) */
export function parseSpotify(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{22})/.exec(url);
  return m ? { type: m[1] as 'track' | 'album' | 'playlist', id: m[2] } : null;
}

/** youtube.com/watch?v=ID, youtu.be/ID, music.youtube.com/watch?v=ID, /shorts/ID, /embed/ID */
export function parseYouTube(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id: string | null = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v') ?? /^\/(?:shorts|embed|live)\/([^/]+)/.exec(u.pathname)?.[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

export function spotifyEmbedSrc(url: string): string | null {
  const s = parseSpotify(url);
  return s ? `https://open.spotify.com/embed/${s.type}/${s.id}` : null;
}

export function youtubeEmbedSrc(id: string, startSeconds = 0, autoplay = false): string {
  const params = new URLSearchParams({ rel: '0' });
  if (startSeconds > 0) params.set('start', String(startSeconds));
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}
