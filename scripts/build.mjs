#!/usr/bin/env node
// Generador estàtic sense dependències: content/*.json + src/ → dist/
// Ús: node scripts/build.mjs   (SITE_URL=https://www.cantintorer.com per a producció)

import { readFile, writeFile, mkdir, rm, cp, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { home } from '../src/templates/home.mjs';
import { legalPage, notFoundPage } from '../src/templates/pages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'dist');
const readJson = async (p) => JSON.parse(await readFile(join(root, p), 'utf8'));

const site = await readJson('content/site.json');
const carta = await readJson('content/carta.json');
const menus = await readJson('content/menus.json');
const images = await readJson('content/images.json');
const legal = await readJson('content/legal.json');
const i18n = Object.fromEntries(await Promise.all(site.langs.map(async (l) => [l, await readJson(`content/i18n/${l}.json`)])));

const baseUrl = (process.env.SITE_URL || site.baseUrl).replace(/\/$/, '');
const basePath = new URL(baseUrl).pathname.replace(/\/$/, '');

const hash = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 10);

// --- CSS: concatena per ordre de capes i elimina comentaris i espais sobrers ---
const cssOrder = ['tokens.css', 'fonts.css', 'base.css', 'layout.css', 'components.css', 'sections.css', 'utilities.css'];
const css = (await Promise.all(cssOrder.map((f) => readFile(join(root, 'src/css', f), 'utf8'))))
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s*\n\s*/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .trim();
const cssFile = `site.${hash(css)}.css`;

// --- JS: un sol mòdul ---
const js = await readFile(join(root, 'src/js/main.js'), 'utf8');
const jsFile = `main.${hash(js)}.js`;

await rm(out, { recursive: true, force: true });
await mkdir(join(out, 'assets/css'), { recursive: true });
await mkdir(join(out, 'assets/js'), { recursive: true });
await writeFile(join(out, 'assets/css', cssFile), css.replaceAll('../assets/', '../'));
await writeFile(join(out, 'assets/js', jsFile), js);

// --- Recursos estàtics: els del repositori i els baixats per scripts/fetch-assets.mjs ---
// L'ordre importa: els fitxers de src/assets sobreescriuen els de la memòria cau
const assetDirs = [join(root, '.cache/assets'), join(root, 'src/assets')];
for (const dir of assetDirs) {
  try { await stat(dir); } catch { continue; }
  await cp(dir, join(out, 'assets'), { recursive: true });
}

// Avisa si falten imatges del manifest (executa `npm run assets` abans del build)
const missing = [];
for (const id of Object.keys(images.images)) {
  for (const w of images.widths) {
    try { await stat(join(out, 'assets/img', `${id}-${w}.webp`)); } catch { missing.push(`${id}-${w}.webp`); }
  }
}
if (missing.length) console.warn(`⚠ Falten ${missing.length} imatges (executa npm run assets): ${missing.slice(0, 4).join(', ')}…`);

// --- Context compartit per a les plantilles ---
const legalPages = legal.pages;
const slugFor = (pageId) => (l) => (pageId ? legalPages.find((p) => p.id === pageId).slug[l] : '');
const langPrefix = (l) => (l === site.defaultLang ? '' : `/${l}`);
const formOrigin = site.booking.endpoint ? new URL(site.booking.endpoint).origin : '';

function makeCtx(lang, pageId = null) {
  const t = i18n[lang];
  const locale = `${lang}-ES`;
  const money = (n) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: Number.isInteger(n) ? 0 : 2 }).format(n);
  const url = (l, slug = '') => `${basePath}${langPrefix(l)}/${slug ? `${slug}/` : ''}`;
  return {
    lang, t, i18n, site, carta, menus, images, legalPages,
    otherLang: site.langs.find((l) => l !== lang),
    year: new Date().getFullYear(),
    price: money,
    url,
    home: url(lang),
    slugFor: slugFor(pageId),
    legalSlug: (id) => legalPages.find((p) => p.id === id).slug[lang],
    absoluteUrl: (l, slug = '') => `${baseUrl}${langPrefix(l)}/${slug ? `${slug}/` : ''}`,
    asset: (p) => `${basePath}/assets/${p}`,
    absoluteAsset: (p) => `${baseUrl}/assets/${p}`,
    cssHref: `${basePath}/assets/css/${cssFile}`,
    jsHref: `${basePath}/assets/js/${jsFile}`,
    formOrigin,
  };
}

// La URL d'una pàgina en un idioma: es demana a makeCtx des de la plantilla
const pages = [];
const write = async (rel, content) => {
  const file = join(out, rel);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, String(content));
  pages.push(rel);
};

for (const lang of site.langs) {
  const prefix = langPrefix(lang).replace(/^\//, '');
  await write(join(prefix, 'index.html'), home(makeCtx(lang)));
  for (const page of legalPages) {
    await write(join(prefix, page.slug[lang], 'index.html'), legalPage(makeCtx(lang, page.id), page));
  }
}
await write('404.html', notFoundPage(makeCtx(site.defaultLang)));

// --- sitemap.xml i robots.txt ---
const entries = [['', null], ...legalPages.map((p) => [p.id, p])];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.flatMap(([id, p]) => site.langs.map((l) => {
  const loc = (lang) => `${baseUrl}${langPrefix(lang)}/${p ? `${p.slug[lang]}/` : ''}`;
  return `  <url>
    <loc>${loc(l)}</loc>
${site.langs.map((a) => `    <xhtml:link rel="alternate" hreflang="${a}" href="${loc(a)}"/>`).join('\n')}
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc(site.defaultLang)}"/>
  </url>`;
})).join('\n')}
</urlset>
`;
await writeFile(join(out, 'sitemap.xml'), sitemap);
await writeFile(join(out, 'robots.txt'), site.preview
  ? 'User-agent: *\nDisallow: /\n'
  : `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`);
await writeFile(join(out, '.nojekyll'), '');

console.log(`✓ ${pages.length} pàgines a dist/ (base ${baseUrl})`);
console.log(`  css: ${cssFile} · js: ${jsFile}`);
