// Prüft das Board in Chromium ohne Fenster:
// 1. öffnet index.html?test als lokale Datei und gibt die Ergebnisse von tests.js aus,
// 2. liefert den Ordner über einen lokalen Webserver aus und prüft, dass die App danach auch ohne Internet startet.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const marks = { ok: '✓', fail: '✗', skip: '–' };
const results = [];
const browser = await chromium.launch();

try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  page.on('pageerror', error => console.error('Fehler auf der Seite:', error.message));
  await page.goto(pathToFileURL('index.html').href + '?test');
  const handle = await page.waitForFunction(() => window.testResults, null, { timeout: 60000 });
  results.push(...await handle.jsonValue());
  await page.close();
} catch (error) {
  results.push({ name: 'tests.js läuft bis zum Ende', status: 'fail', detail: error.message });
}

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.ico': 'image/x-icon',
};
const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, 'http://localhost').pathname));
  const file = join('.', path.endsWith('/') || path.endsWith('\\') ? path + 'index.html' : path);
  try {
    if (file.startsWith('..')) throw new Error('ausserhalb des Ordners');
    const data = await readFile(file);
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    response.end(data);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const stopServer = () => new Promise(resolve => {
  if (!server.listening) return resolve();
  server.close(resolve);
  server.closeAllConnections();
});

async function check(name, run) {
  try {
    await run();
    results.push({ name, status: 'ok' });
  } catch (error) {
    results.push({ name, status: 'fail', detail: error.message.split('\n')[0] });
  }
}

const context = await browser.newContext();
const app = await context.newPage();
const url = `http://127.0.0.1:${server.address().port}/`;

await check('App: Manifest mit Name, eigenem Fenster und Symbolen', async () => {
  await app.goto(url);
  const manifest = await app.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  if (manifest.name !== 'Firmen-Research-Board') throw new Error(`Name „${manifest.name}“`);
  if (manifest.display !== 'standalone') throw new Error(`display „${manifest.display}“`);
  for (const icon of manifest.icons) {
    const status = await app.evaluate(async src => (await fetch(src)).status, icon.src);
    if (status !== 200) throw new Error(`Symbol ${icon.src}: HTTP ${status}`);
  }
});

await check('App: startet nach dem ersten Öffnen auch ohne Internet', async () => {
  await app.evaluate(() => navigator.serviceWorker.ready.then(() => true));
  await app.waitForFunction(async () => Boolean(await caches.match('./')), null, { timeout: 15000 });
  await stopServer();
  await context.setOffline(true);
  await app.reload();
  const columns = await app.locator('.column').count();
  if (columns !== 3) throw new Error(`Ohne Internet zeigt die Seite ${columns} statt 3 Spalten`);
  await app.locator('#add').click();
  if (!await app.locator('#dialog').evaluate(dialog => dialog.open)) throw new Error('Ohne Internet öffnet sich der Dialog nicht');
});

await browser.close();
await stopServer();

for (const result of results) console.log(`${marks[result.status]} ${result.name}${result.detail ? ' — ' + result.detail : ''}`);
const notOk = results.filter(result => result.status !== 'ok');
console.log(`\n${results.length - notOk.length} von ${results.length} Prüfungen bestanden`);
if (notOk.length) {
  console.error(`${notOk.length} fehlgeschlagen oder übersprungen`);
  process.exit(1);
}
