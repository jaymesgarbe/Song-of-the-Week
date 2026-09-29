import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { parseSpotify, parseYouTube } from './lib/embeds';

// One Markdown file per week in src/content/weeks/NNN.md.
// Only week/title/artist/score are required, so imported legacy weeks
// (1–87) stay valid; everything else fills in for new weeks.
// Treat blank fields (e.g. `spotify: ""` from the new-week template) as not set
const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const weeks = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/weeks' }),
  schema: z.object({
    week: z.number().int().positive(),
    title: z.string(),
    // A string, or an array for collaborations. Arrays keep
    // "Tyler, The Creator" from being split on its comma.
    artist: z.union([z.string(), z.array(z.string()).min(1)]),
    score: z.number().min(0).max(10),
    date: z.coerce.date().optional(),
    album: z.string().optional(),
    year: z.number().int().optional(),
    // Path under /public, e.g. "/covers/088.jpg"
    cover: z.string().optional(),
    // Either a plain sentence, or { note, timestamp } if you want to point at a moment.
    favorite: z.preprocess(blankToUndefined, z
      .union([
        z.string(),
        z.object({
          note: z.string(),
          // Optional: "m:ss" or "h:mm:ss"
          timestamp: z.string().regex(/^(\d+:)?\d{1,2}:\d{2}$/).optional(),
        }),
      ])
      .transform((f) => (typeof f === 'string' ? { note: f, timestamp: undefined } : f))
      .optional()),
    links: z
      .object({
        // Paste share links as-is; these two also become embedded players.
        spotify: z.preprocess(
          blankToUndefined,
          z.url()
            .refine((u) => parseSpotify(u) !== null, 'Use a Spotify track, album or playlist link (open.spotify.com/track/...)')
            .optional(),
        ),
        youtube: z.preprocess(
          blankToUndefined,
          z.url()
            .refine((u) => parseYouTube(u) !== null, 'Use a YouTube video link (youtube.com/watch?v=... or youtu.be/...)')
            .optional(),
        ),
        apple: z.preprocess(blankToUndefined, z.url().optional()),
        bandcamp: z.preprocess(blankToUndefined, z.url().optional()),
      })
      .optional(),
    // Weeks can exist as files before they go live
    draft: z.boolean().default(false),
    // Imported from the old site: score only, no page, not clickable in the archive
    legacy: z.boolean().default(false),
  }),
});

export const collections = { weeks };
