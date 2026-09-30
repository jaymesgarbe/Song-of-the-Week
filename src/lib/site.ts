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
    // Circle behind the doodle, e.g. '#ff6c2f'. null = no circle, just the doodle.
    sticker: null as string | null,
    // Recolor the doodle, e.g. '#1f1e1c'. null = keep the drawing's own colors.
    ink: null as string | null,
    // Thicken lines for tiny sizes (0 = off). Keep low for detailed drawings.
    thicken: 0,
    // Square behind the whole icon (tab and home screen). null = transparent in the tab.
    // Palette: orange '#ff6c2f', teal '#00838a', paper '#eeeee9'
    background: '#ff6c2f' as string | null,
    paper: '#eeeee9', // home-screen fallback when background is null
  },
};
