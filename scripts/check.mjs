#!/usr/bin/env node
// Comprovacions estàtiques del resultat (dist/). Falla amb codi 1 si troba errors.
// Sense dependències: regex sobre HTML generat per nosaltres mateixos.

import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const site = JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8'));
const basePath = new URL(process.env.SITE_URL || site.baseUrl).pathname.replace(/\/$/, '');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

const files = (await walk(dist)).filter((f) => f.endsWith('.html'));
const errors = [];
const fail = (file, msg) => errors.push(`${relative(dist, file)}: ${msg}`);
const exists = async (p) => { try { await stat(p); return true; } catch { return false; } };
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

for (const file of files) {
  const htmlText = await readFile(file, 'utf8');
  const ids = new Set([...htmlText.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

  // Estructura
  if ((htmlText.match(/<main[\s>]/g) || []).length !== 1) fail(file, 'ha de tenir exactament un <main>');
  if ((htmlText.match(/<h1[\s>]/g) || []).length !== 1) fail(file, 'ha de tenir exactament un <h1>');
  let prev = 0;
  for (const [, lvl] of htmlText.matchAll(/<h([1-6])[\s>]/g)) {
    const n = Number(lvl);
    if (prev && n > prev + 1) fail(file, `salt de capçalera h${prev} → h${n}`);
    prev = n;
  }

  // CSP: res inline
  if (/\sstyle="/.test(htmlText)) fail(file, 'atribut style inline');
  if (/<style[\s>]/.test(htmlText)) fail(file, 'bloc <style> inline');
  if (/\son[a-z]+="/i.test(htmlText)) fail(file, 'handler d\'esdeveniment inline');
  for (const [tag] of htmlText.matchAll(/<script\b[^>]*>/g)) {
    const type = attr(tag, 'type');
    if (!attr(tag, 'src') && !['application/json', 'application/ld+json'].includes(type)) fail(file, `script inline executable: ${tag}`);
  }
  for (const [, json] of htmlText.matchAll(/<script type="application\/(?:ld\+)?json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch { fail(file, 'JSON incrustat no vàlid'); }
  }

  // Imatges
  for (const [tag] of htmlText.matchAll(/<img\b[^>]*>/g)) {
    for (const a of ['alt', 'width', 'height', 'src']) if (attr(tag, a) === undefined) fail(file, `<img> sense ${a}: ${tag.slice(0, 80)}`);
    if (!attr(tag, 'srcset')) fail(file, `<img> sense srcset: ${attr(tag, 'src')}`);
  }

  // Formularis: cada control amb id, name i label associat
  const labelsFor = new Set([...htmlText.matchAll(/<label[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
  for (const [tag] of htmlText.matchAll(/<(?:input|select|textarea)\b[^>]*>/g)) {
    if (/type="(hidden|submit)"/.test(tag)) continue;
    const id = attr(tag, 'id');
    if (!id) fail(file, `control sense id: ${tag.slice(0, 60)}`);
    if (!attr(tag, 'name')) fail(file, `control sense name: ${tag.slice(0, 60)}`);
    if (id && !labelsFor.has(id)) fail(file, `control sense <label for="${id}">`);
  }
  for (const f of labelsFor) if (!ids.has(f)) fail(file, `label for="${f}" sense element`);

  // SEO
  for (const needle of ['rel="canonical"', 'hreflang="ca"', 'hreflang="es"', 'hreflang="x-default"', 'property="og:image"', 'name="description"']) {
    if (!htmlText.includes(needle)) fail(file, `falta ${needle}`);
  }

  // Enllaços interns i ancoratges
  for (const [, href] of htmlText.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    if (href.startsWith('#')) {
      if (href.length > 1 && !ids.has(href.slice(1))) fail(file, `ancoratge inexistent ${href}`);
      continue;
    }
    if (!href.startsWith(`${basePath}/`) && href !== basePath) continue;
    const [path, hash] = href.slice(basePath.length).split('#');
    const target = join(dist, path.endsWith('/') ? `${path}index.html` : path);
    if (!(await exists(target))) { fail(file, `enllaç trencat ${href}`); continue; }
    if (hash && target.endsWith('.html')) {
      const other = await readFile(target, 'utf8');
      if (!other.includes(`id="${hash}"`)) fail(file, `ancoratge inexistent ${href}`);
    }
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problemes:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log(`✓ ${files.length} pàgines comprovades sense errors`);
