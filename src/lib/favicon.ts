// Builds the site icon from one of your doodles (settings in src/lib/site.ts).
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
  const chosen = SITE.favicon.doodle?.toLowerCase();
  if (chosen) {
    const match = files.find(
      (f) => f.toLowerCase() === chosen || path.parse(f).name.toLowerCase() === chosen,
    );
    if (!match) {
      throw new Error(
        `Favicon doodle "${SITE.favicon.doodle}" not found in public/doodles/. Available: ${files.join(', ') || '(none)'}`,
      );
    }
    return match;
  }
  const own = files.filter((f) => !f.startsWith('placeholder-'));
  return own[0] ?? files[0] ?? null;
}

function hexToUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => +(c / 255).toFixed(4)) as [number, number, number];
}

/** @param opts.tile  true for the phone home-screen icon (solid paper background) */
export function faviconSvg(opts: { tile?: boolean } = {}): string {
  const { sticker, ink, thicken, paper, background } = SITE.favicon;
  const file = pickDoodle();

  // With a sticker the doodle sits inside the circle; without, it fills the icon.
  const pad = sticker ? 13 : background || opts.tile ? 7 : 1;
  const size = 64 - pad * 2;

  let doodle = '';
  if (file) {
    const data = fs.readFileSync(path.join(DIR, file)).toString('base64');
    const mime = TYPES[path.extname(file).toLowerCase()];
    const steps: string[] = [];
    let src = 'SourceGraphic';
    if (thicken > 0) {
      steps.push(`<feMorphology operator="dilate" radius="${thicken}" in="${src}" result="thick"/>`);
      src = 'thick';
    }
    if (ink) {
      const [r, g, b] = hexToUnit(ink);
      steps.push(`<feColorMatrix in="${src}" type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0"/>`);
    }
    const filter = steps.length
      ? `<defs><filter id="f" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">${steps.join('')}</filter></defs>`
      : '';
    doodle = `${filter}<image href="data:${mime};base64,${data}" x="${pad}" y="${pad}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"${steps.length ? ' filter="url(#f)"' : ''}/>`;
  }

  // Rounded square in the tab; full square for home screens (the phone rounds it)
  const fill = background ?? (opts.tile ? paper : null);
  const bg = fill ? `<rect width="64" height="64" rx="${opts.tile ? 0 : 12}" fill="${fill}"/>` : '';
  const circle = sticker ? `<circle cx="32" cy="32" r="${opts.tile ? 26 : 31}" fill="${sticker}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${bg}${circle}${doodle}</svg>`;
}

export async function faviconPng(size: number, opts: { tile?: boolean } = {}): Promise<Uint8Array> {
  const { default: sharp } = await import('sharp');
  const png = await sharp(Buffer.from(faviconSvg(opts)), { density: Math.ceil((72 * size) / 64) * 2 })
    .resize(size, size)
    .png()
    .toBuffer();
  return new Uint8Array(png);
}
