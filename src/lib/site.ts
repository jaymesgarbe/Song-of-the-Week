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
    // File name in public/doodles/ to use as the browser-tab icon, e.g. 'star.png'.
    // null = your first doodle (alphabetically). Bold, simple shapes read best at tab size.
    doodle: 'logo.png',
    sticker: '#ff6c2f', // circle color (palette orange)
    ink: '#1f1e1c',     // doodle color
    paper: '#eeeee9',   // background for the phone home-screen icon
  },
};
