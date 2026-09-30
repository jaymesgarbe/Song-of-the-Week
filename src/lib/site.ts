// Site-wide settings. Edit here; used by the byline, footer and page titles.
export const SITE = {
  title: 'Song of the Week',
  author: {
    name: 'Jaymes Garbe',
    // Optional square photo in /public, e.g. '/author.jpg'. Leave null for name only.
    avatar: null as string | null,
    // Optional link on your name (Instagram, personal site, etc.)
    url: null as string | null,
  },
  favicon: {
    // Doodle in public/doodles/ to use as the browser-tab icon: a file name ('record.png')
    // or just its name without extension ('record'). null = your first doodle.
    doodle: 'record' as string | null,
    // Color that shows through the gaps in the drawing. null = transparent.
    // Palette: orange '#ff6c2f', teal '#00838a', paper '#eeeee9'
    background: '#f5f5f0' as string | null,
    // 'circle': the drawing is cropped to its edges and fills a round icon (made for the record).
    // 'square': the drawing sits inside a rounded square.
    shape: 'circle' as 'circle' | 'square',
    // Recolor the drawing, e.g. '#1f1e1c'. null = keep its own colors.
    ink: null as string | null,
    paper: '#eeeee9', // home-screen icon background around a circle
  },
};
