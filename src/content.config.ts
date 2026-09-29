import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One Markdown file per week in src/content/weeks/NNN.md.
// Only week/title/artist/score are required, so imported legacy weeks
// (1–87) stay valid; everything else fills in for new weeks.
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
    favorite: z
      .object({
        // "m:ss" or "h:mm:ss"
        timestamp: z.string().regex(/^(\d+:)?\d{1,2}:\d{2}$/),
        note: z.string().optional(),
        // YouTube video ID; used to embed the song starting at the timestamp
        youtubeId: z.string().optional(),
      })
      .optional(),
    links: z
      .object({
        spotify: z.url().optional(),
        apple: z.url().optional(),
        youtube: z.url().optional(),
        bandcamp: z.url().optional(),
      })
      .optional(),
    // Weeks can exist as files before they go live
    draft: z.boolean().default(false),
    // Imported from the old site: score only, no page, not clickable in the archive
    legacy: z.boolean().default(false),
  }),
});

export const collections = { weeks };
