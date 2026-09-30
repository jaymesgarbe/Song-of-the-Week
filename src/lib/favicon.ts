// Builds the site icon from one of your doodles (settings in src/lib/site.ts).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { SITE } from './site';

const DIR = path.join(process.cwd(), 'public', 'doodles');
const EXTS = ['.svg', '.png', '.webp'];

function pickDoodle(): string | null {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => EXTS.includes(path.extname(f).toLowerCase())).sort();
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

/** The doodle as a PNG cropped tight to the drawing (removes empty margins), as a data URI. */
let cached: string | null | undefined;
async function doodleDataUri(): Promise<string | null> {
  if (cached !== undefined) return cached;
  const file = pickDoodle();
  if (!file) return (cached = null);
  const png = await sharp(path.join(DIR, file), { density: 300 })
    .resize(512, 512, { fit: 'inside' })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
  return (cached = `data:image/png;base64,${png.toString('base64')}`);
}

function hexToUnit(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => +(c / 255).toFixed(4)) as [number, number, number];
}

/** @param opts.tile  true for the phone home-screen icon (always a full square) */
export async function faviconSvg(opts: { tile?: boolean } = {}): Promise<string> {
  const { background, shape, ink, paper } = SITE.favicon;
  const uri = await doodleDataUri();

  const filter = ink
    ? (() => {
        const [r, g, b] = hexToUnit(ink);
        return `<filter id="f" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  0 0 0 1 0"/></filter>`;
      })()
    : '';
  const filterAttr = ink ? ' filter="url(#f)"' : '';

  let body: string;
  if (shape === 'circle') {
    // Drawing fills a circle edge to edge; background only shows through its gaps.
    const inset = opts.tile ? 5 : 0; // breathing room on the home-screen square
    const r = 32 - inset;
    const tileBg = opts.tile ? `<rect width="64" height="64" fill="${paper}"/>` : '';
    body = `<defs><clipPath id="c"><circle cx="32" cy="32" r="${r}"/></clipPath>${filter}</defs>
  ${tileBg}<g clip-path="url(#c)">
    ${background ? `<rect width="64" height="64" fill="${background}"/>` : ''}
    ${uri ? `<image href="${uri}" x="${inset}" y="${inset}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid slice"${filterAttr}/>` : ''}
  </g>`;
  } else {
    const pad = 7;
    const bg = background ?? (opts.tile ? paper : null);
    body = `<defs>${filter}</defs>
  ${bg ? `<rect width="64" height="64" rx="${opts.tile ? 0 : 12}" fill="${bg}"/>` : ''}
  ${uri ? `<image href="${uri}" x="${pad}" y="${pad}" width="${64 - pad * 2}" height="${64 - pad * 2}" preserveAspectRatio="xMidYMid meet"${filterAttr}/>` : ''}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  ${body}
</svg>`;
}

export async function faviconPng(size: number, opts: { tile?: boolean } = {}): Promise<Uint8Array> {
  const svg = Buffer.from(await faviconSvg(opts));
  const png = await sharp(svg, { density: Math.ceil((72 * size) / 64) * 2 }).resize(size, size).png().toBuffer();
  return new Uint8Array(png);
}
