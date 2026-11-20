#!/usr/bin/env node
// Servidor local mínim per previsualitzar dist/ amb el mateix basePath que a producció.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const site = JSON.parse(await readFile(join(root, 'content/site.json'), 'utf8'));
const basePath = new URL(process.env.SITE_URL || site.baseUrl).pathname.replace(/\/$/, '');
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!path.startsWith(basePath)) { res.writeHead(302, { Location: `${basePath}/` }); return res.end(); }
  path = path.slice(basePath.length) || '/';
  let file = join(dist, path);
  try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { file = join(dist, '404.html'); res.statusCode = 404; }
  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.end(body);
  } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(port, () => console.log(`http://localhost:${port}${basePath}/`));
