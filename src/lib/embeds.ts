// Turn the Spotify share URL you paste into a week file into an embed URL.

/** open.spotify.com/track/ID, /album/ID, /playlist/ID (with optional /intl-xx/ and ?si=...) */
export function parseSpotify(url: string): { type: 'track' | 'album' | 'playlist'; id: string } | null {
  const m = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist)\/([A-Za-z0-9]{22})/.exec(url);
  return m ? { type: m[1] as 'track' | 'album' | 'playlist', id: m[2] } : null;
}

export function spotifyEmbedSrc(url: string): string | null {
  const s = parseSpotify(url);
  return s ? `https://open.spotify.com/embed/${s.type}/${s.id}` : null;
}
