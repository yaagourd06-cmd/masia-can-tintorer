#!/usr/bin/env node
// Descarga en temps de build els recursos remots que la web serveix des del seu propi domini:
//  - imatges del manifest (content/images.json) retallades a cada amplada en WebP
//  - tipografies variables (subconjunt llatí) des de l'API de Google Fonts
// Es desen a .cache/assets/ (ignorat per git i cachejat a CI). Idempotent: no torna a baixar el que ja hi és.

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cache = join(root, '.cache/assets');
const images = JSON.parse(await readFile(join(root, 'content/images.json'), 'utf8'));

const exists = async (p) => { try { return (await stat(p)).size > 0; } catch { return false; } };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function download(url, file) {
  if (await exists(file)) return false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, Buffer.from(await res.arrayBuffer()));
      return true;
    } catch (err) {
      if (attempt === 3) throw new Error(`No s'ha pogut baixar ${url}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

const unsplash = (source, params) => `https://images.unsplash.com/${source}?${new URLSearchParams({ fit: 'crop', crop: 'entropy', q: '70', ...params })}`;

// --- Imatges ---
const jobs = [];
for (const [id, img] of Object.entries(images.images)) {
  const [rw, rh] = img.ratio;
  for (const w of images.widths) {
    const h = Math.round((w * rh) / rw);
    jobs.push([unsplash(img.source, { w, h, fm: 'webp' }), join(cache, 'img', `${id}-${w}.webp`)]);
  }
}
jobs.push([unsplash(images.og.source, { w: images.og.width, h: images.og.height, fm: 'jpg' }), join(cache, 'img', 'og.jpg')]);

// --- Tipografies ---
const fonts = [
  { family: 'Cormorant+Garamond:ital,wght@0,400..600;1,400..600', files: { normal: 'cormorant-garamond-latin.woff2', italic: 'cormorant-garamond-italic-latin.woff2' } },
  { family: 'DM+Sans:wght@400..700', files: { normal: 'dm-sans-latin.woff2' } },
];
for (const font of fonts) {
  const targets = Object.values(font.files).map((f) => join(cache, 'fonts', f));
  if ((await Promise.all(targets.map(exists))).every(Boolean)) continue;
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${font.family}&display=swap`, { headers: { 'User-Agent': UA } }).then((r) => r.text());
  // Blocs «/* latin */ @font-face { ... }»: ens quedem amb el subconjunt llatí de cada estil
  for (const [, block] of css.matchAll(/\/\*\s*latin\s*\*\/\s*@font-face\s*{([^}]*)}/g)) {
    const style = block.match(/font-style:\s*(\w+)/)?.[1];
    const url = block.match(/url\(([^)]+\.woff2)\)/)?.[1];
    if (style && url && font.files[style]) jobs.push([url, join(cache, 'fonts', font.files[style])]);
  }
}

let downloaded = 0;
for (const [url, file] of jobs) if (await download(url, file)) downloaded += 1;

const missingFonts = [];
for (const f of fonts.flatMap((x) => Object.values(x.files))) if (!(await exists(join(cache, 'fonts', f)))) missingFonts.push(f);
if (missingFonts.length) throw new Error(`Falten tipografies: ${missingFonts.join(', ')}`);

console.log(`✓ Recursos a .cache/assets (${downloaded} baixats, ${jobs.length - downloaded} ja en memòria cau)`);
