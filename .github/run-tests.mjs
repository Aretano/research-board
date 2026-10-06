// Öffnet index.html?test als lokale Datei in Chromium ohne Fenster und gibt die Ergebnisse von tests.js aus.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';

const marks = { ok: '✓', fail: '✗', skip: '–' };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
page.on('pageerror', error => console.error('Fehler auf der Seite:', error.message));

let results;
try {
  await page.goto(pathToFileURL('index.html').href + '?test');
  const handle = await page.waitForFunction(() => window.testResults, null, { timeout: 60000 });
  results = await handle.jsonValue();
} catch (error) {
  console.error('Die Tests sind nicht bis zum Ende gelaufen:', error.message);
  await browser.close();
  process.exit(1);
}
await browser.close();

for (const result of results) console.log(`${marks[result.status]} ${result.name}${result.detail ? ' — ' + result.detail : ''}`);
const notOk = results.filter(result => result.status !== 'ok');
console.log(`\n${results.length - notOk.length} von ${results.length} Tests bestanden`);
if (notOk.length) {
  console.error(`${notOk.length} fehlgeschlagen oder übersprungen`);
  process.exit(1);
}
