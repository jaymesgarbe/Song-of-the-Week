// Builds the site icon from one of your doodles: the doodle in black ink on an
// orange sticker, matching the score sticker. Used by the favicon endpoints.
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from './site';

const DIR = path.join(process.cwd(), 'public', 'doodles');
const TYPES: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };

function pickDoodle(): string | null {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => path.extname(f).toLowerCase() in TYPES).sort();
  } catch {
    return null;
  }
  const chosen = SITE.favicon.doodle;
  if (chosen) {
    if (!files.includes(chosen)) throw new Error(`Favicon doodle "${chosen}" not found in public/doodles/`);
    return chosen;
  }
  const own = files.filter((f) => !f.startsWith('placeholder-'));
  return own[0] ?? files.find((f) => f.includes('star')) ?? files[0] ?? null;
}

function hexToUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => +(c / 255).toFixed(4)) as [number, number, number];
}

/**
 * @param opts.tile  true for the phone home-screen icon: a solid paper square behind the sticker
 */
export function faviconSvg(opts: { tile?: boolean } = {}): string {
  const { sticker, ink, paper } = SITE.favicon;
  const file = pickDoodle();
  const [r, g, b] = hexToUnit(ink);

  let doodle = '';
  if (file) {
    const data = fs.readFileSync(path.join(DIR, file)).toString('base64');
    const mime = TYPES[path.extname(file).toLowerCase()];
    doodle = `
  <defs>
    <filter id="ink" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="thick"/>
      <feColorMatrix in="thick" type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0"/>
    </filter>
  </defs>
  <image href="data:${mime};base64,${data}" x="11" y="11" width="42" height="42" preserveAspectRatio="xMidYMid meet" filter="url(#ink)"/>`;
  }

  const bg = opts.tile ? `<rect width="64" height="64" fill="${paper}"/>` : '';
  const radius = opts.tile ? 26 : 31;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${bg}<circle cx="32" cy="32" r="${radius}" fill="${sticker}"/>${doodle}
</svg>`;
}

export async function faviconPng(size: number, opts: { tile?: boolean } = {}): Promise<Uint8Array> {
  const { default: sharp } = await import('sharp');
  const svg = Buffer.from(faviconSvg(opts));
  const png = await sharp(svg, { density: Math.ceil((72 * size) / 64) * 2 })
    .resize(size, size)
    .png()
    .toBuffer();
  return new Uint8Array(png);
}
