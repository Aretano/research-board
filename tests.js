// Tests für das Research-Board. Start: tests.html öffnen (lädt index.html?test).
// Im Testmodus nutzt das Board einen eigenen Speicherschlüssel; die echten Daten bleiben unberührt.
(async () => {
  const results = [];
  const realConfirm = window.confirm, realAlert = window.alert, realSave = save;
  let confirmAnswer, confirms, alerts, saves;
  window.confirm = message => { confirms.push(message); return confirmAnswer; };
  window.alert = message => { alerts.push(message); };
  save = () => { saves++; realSave(); };

  class Skip extends Error {}
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const equal = (actual, expected, what) =>
    assert(actual === expected, `${what}: erwartet „${expected}“, erhalten „${actual}“`);

  const mk = (id, status, rating) => ({ id, name: 'Firma ' + id.toUpperCase(), sector: 'Branche', status, rating, notes: '', url: '' });
  const seed = () => [mk('a', 'offen', 2), mk('b', 'offen', 5), mk('c', 'offen', 2), mk('x', 'fertig', 1), mk('y', 'fertig', 4)];
  const columnOf = status => document.querySelector(`.column[data-status="${status}"]`);
  const col = status => [...columnOf(status).querySelectorAll('.card')].map(card => card.dataset.id).join('');
  const live = () => $('live').textContent;
  const focused = () => document.activeElement.dataset.id || document.activeElement.id;
  const stored = () => JSON.parse(localStorage.getItem(STORAGE_KEY));
  const midY = (id, offset = 0) => { const box = cardFor(id).getBoundingClientRect(); return box.top + box.height / 2 + offset; };

  // Das close-Ereignis eines Dialogs kommt verzögert; erst danach hat das Board den Fokus gesetzt.
  const untilClosed = (action, dialog = $('dialog')) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Dialog hat sich nicht geschlossen')), 3000);
    dialog.addEventListener('close', () => { clearTimeout(timer); resolve(); }, { once: true });
    action();
  });

  async function until(condition, what) {
    const start = performance.now();
    while (!condition()) {
      if (performance.now() - start > 3000) throw new Error('Zeitüberschreitung: ' + what);
      await wait(10);
    }
  }

  async function reset() {
    for (const dialog of [$('dialog'), $('help')]) if (dialog.open) await untilClosed(() => dialog.close(), dialog);
    hideUndo();
    endTouchDrag();
    $('search').value = '';
    $('minRating').value = '0';
    companies = seed();
    realSave();
    render();
    $('live').textContent = '';
    confirmAnswer = true;
    confirms = [];
    alerts = [];
    saves = 0;
    scrollTo(0, 0);
  }

  function press(key, target = document.activeElement, init = {}) {
    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }

  function openCard(id) {
    cardFor(id).focus();
    press('Enter');
  }

  function dragTo(id, status, y) {
    const dataTransfer = new DataTransfer();
    const source = cardFor(id);
    source.dispatchEvent(new DragEvent('dragstart', { dataTransfer, bubbles: true }));
    columnOf(status).dispatchEvent(new DragEvent('dragover', { dataTransfer, clientY: y, bubbles: true, cancelable: true }));
    columnOf(status).dispatchEvent(new DragEvent('drop', { dataTransfer, clientY: y, bubbles: true, cancelable: true }));
    source.dispatchEvent(new DragEvent('dragend', { dataTransfer, bubbles: true }));
  }

  function touch(type, target, x, y) {
    const point = new Touch({ identifier: 1, target, clientX: x, clientY: y });
    const event = new TouchEvent(type, { touches: type === 'touchmove' || type === 'touchstart' ? [point] : [], changedTouches: [point], bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }

  async function importFile(text) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File([text], 'import.json', { type: 'application/json' }));
    $('importFile').files = dataTransfer.files;
    const before = confirms.length + alerts.length;
    $('importFile').dispatchEvent(new Event('change', { bubbles: true }));
    await until(() => confirms.length + alerts.length > before, 'Import hat weder nachgefragt noch gemeldet');
  }

  async function test(name, run) {
    try {
      await reset();
      await run();
      results.push({ name, status: 'ok' });
    } catch (error) {
      results.push({ name, status: error instanceof Skip ? 'skip' : 'fail', detail: error.message });
    }
  }

  // In einem Tab im Hintergrund liefert der Browser manche Ereignisse nicht aus; die Tests warten, bis der Tab sichtbar ist.
  if (document.hidden) {
    document.title = 'Tests warten, bis dieser Tab sichtbar ist';
    await new Promise(resolve => document.addEventListener('visibilitychange', resolve, { once: true }));
  }

  await test('Unternehmen anlegen', async () => {
    $('add').click();
    equal($('dialogTitle').textContent, 'Neues Unternehmen', 'Dialogtitel');
    $('fName').value = '  Neue AG  ';
    $('fSector').value = 'Pharma';
    $('fStatus').value = 'arbeit';
    $('fRating').value = 4;
    $('fNotes').value = 'Notiz';
    await untilClosed(() => $('form').requestSubmit());
    const company = companies[companies.length - 1];
    equal(company.name, 'Neue AG', 'Name ohne Leerzeichen am Rand');
    equal(col('arbeit'), company.id, 'Karte in der gewählten Spalte');
    equal(cardFor(company.id).querySelector('.stars').textContent, '★★★★☆', 'Sterne');
    equal(focused(), company.id, 'Fokus auf der neuen Karte');
    equal(stored().length, 6, 'Gespeicherte Einträge');
  });

  await test('Unternehmen bearbeiten', async () => {
    openCard('b');
    equal($('fName').value, 'Firma B', 'Dialog zeigt den Namen');
    $('fName').value = 'Beta AG';
    $('fStatus').value = 'fertig';
    await untilClosed(() => $('form').requestSubmit());
    equal(col('offen'), 'ac', 'Spalte Offen');
    equal(col('fertig'), 'bxy', 'Spalte Fertig');
    equal(cardFor('b').querySelector('.name').textContent, 'Beta AG', 'Neuer Name');
    equal(focused(), 'b', 'Fokus auf der bearbeiteten Karte');
  });

  await test('Abbrechen ändert nichts', async () => {
    openCard('a');
    $('fName').value = 'Geändert';
    await untilClosed(() => $('cancel').click());
    equal(companies[0].name, 'Firma A', 'Name');
    equal(saves, 0, 'Speichervorgänge');
    equal(focused(), 'a', 'Fokus bleibt auf der Karte');
  });

  await test('Link erfassen und auf der Karte anzeigen', async () => {
    openCard('a');
    equal($('fUrl').value, '', 'Feld ist anfangs leer');
    $('fUrl').value = ' www.example.com/bericht ';
    $('fUrl').dispatchEvent(new Event('input'));
    await untilClosed(() => $('form').requestSubmit());
    equal(companies[0].url, 'https://www.example.com/bericht', 'Gespeicherte Adresse');
    const link = cardFor('a').querySelector('a.link');
    equal(link.textContent, 'example.com ↗', 'Text auf der Karte');
    equal(link.href, 'https://www.example.com/bericht', 'Ziel');
    equal(link.target, '_blank', 'Öffnet in neuem Tab');
    equal(link.rel, 'noopener noreferrer', 'rel');
    assert(!cardFor('b').querySelector('a.link'), 'Karte ohne Link zeigt keinen');
    openCard('a');
    equal($('fUrl').value, 'https://www.example.com/bericht', 'Dialog zeigt die Adresse');
    $('fUrl').value = '';
    await untilClosed(() => $('form').requestSubmit());
    assert(!cardFor('a').querySelector('a.link'), 'Geleertes Feld entfernt den Link');
  });

  await test('Link öffnet nicht den Bearbeiten-Dialog', () => {
    companies[0].url = 'https://example.com/';
    render();
    const link = cardFor('a').querySelector('a.link');
    link.addEventListener('click', event => event.preventDefault());
    link.click();
    assert(!$('dialog').open, 'Klick auf den Link');
    link.focus();
    assert(!press('Enter', link), 'Enter auf dem Link gehört dem Link');
    assert(!$('dialog').open, 'Enter auf dem Link');
    press('ArrowRight', link);
    equal(col('offen'), 'abc', 'Pfeiltaste auf dem Link verschiebt nicht');
  });

  await test('Ungültiger Link wird nicht gespeichert', () => {
    openCard('a');
    $('fUrl').value = 'kein link';
    $('fUrl').dispatchEvent(new Event('input'));
    assert(!$('fUrl').validity.valid, 'Feld ist als ungültig markiert');
    $('form').requestSubmit();
    assert($('dialog').open, 'Dialog bleibt offen');
    equal(saves, 0, 'Speichervorgänge');
  });

  await test('Import übernimmt nur Web-Adressen als Link', async () => {
    companies = [];
    render();
    await importFile(JSON.stringify([
      { id: 'ok', name: 'Ok', url: 'http://example.org/a' },
      { id: 'js', name: 'Skript', url: 'javascript:alert(1)' },
      { id: 'num', name: 'Zahl', url: 42 },
      { id: 'none', name: 'Ohne' },
    ]));
    equal(companies.map(c => c.url).join('|'), 'http://example.org/a|||', 'Übernommene Adressen');
    equal(document.querySelectorAll('a.link').length, 1, 'Links auf dem Board');
  });

  await test('Karte per Tastatur in die Nachbarspalte verschieben', () => {
    cardFor('a').focus();
    assert(!press('ArrowLeft'), 'Pfeil links in der ersten Spalte darf nichts tun');
    press('ArrowRight');
    equal(col('arbeit'), 'a', 'Spalte In Arbeit');
    equal(live(), 'Firma A nach „In Arbeit“ verschoben', 'Ansage');
    equal(focused(), 'a', 'Fokus bleibt auf der Karte');
    press('ArrowRight');
    equal(col('fertig'), 'axy', 'Spalte Fertig');
    assert(!press('ArrowRight'), 'Pfeil rechts in der letzten Spalte darf nichts tun');
  });

  await test('Karte per Tastatur umsortieren', () => {
    cardFor('a').focus();
    assert(!press('ArrowUp'), 'Pfeil auf bei der obersten Karte darf nichts tun');
    press('ArrowDown');
    equal(col('offen'), 'bac', 'Nach einmal Pfeil ab');
    equal(live(), 'Firma A an Position 2 von 3', 'Ansage');
    press('ArrowDown');
    equal(col('offen'), 'bca', 'Nach zweimal Pfeil ab');
    assert(!press('ArrowDown'), 'Pfeil ab bei der untersten Karte darf nichts tun');
    equal(col('fertig'), 'xy', 'Andere Spalte unverändert');
    equal(focused(), 'a', 'Fokus bleibt auf der Karte');
  });

  await test('Karte per Maus umsortieren', () => {
    dragTo('a', 'offen', midY('c', 5));
    equal(col('offen'), 'bca', 'Ans Ende gezogen');
    dragTo('a', 'offen', midY('b', -5));
    equal(col('offen'), 'abc', 'Zurück an den Anfang gezogen');
    dragTo('c', 'offen', midY('b', -5));
    equal(col('offen'), 'acb', 'In die Mitte gezogen');
  });

  await test('Karte per Maus in eine andere Spalte ziehen', () => {
    dragTo('b', 'fertig', midY('y', -5));
    equal(col('offen'), 'ac', 'Spalte Offen');
    equal(col('fertig'), 'xby', 'Zwischen zwei Karten eingefügt');
    equal(live(), 'Firma B nach „Fertig“ verschoben', 'Ansage');
    dragTo('a', 'arbeit', 0);
    equal(col('arbeit'), 'a', 'In die leere Spalte gezogen');
  });

  await test('Ablegen an derselben Stelle speichert nicht', () => {
    dragTo('a', 'offen', midY('a'));
    dragTo('a', 'offen', midY('b', -5));
    dragTo('c', 'offen', midY('c', 40));
    equal(col('offen'), 'abc', 'Reihenfolge');
    equal(saves, 0, 'Speichervorgänge');
    equal(document.querySelectorAll('.over, .drop-before, .drop-after, .dragging').length, 0, 'Übrig gebliebene Markierungen');
  });

  await test('Karte per Touch ziehen', async () => {
    if (typeof Touch === 'undefined') throw new Skip('Dieser Browser kann keine Touch-Ereignisse simulieren');
    const source = cardFor('a');
    source.scrollIntoView({ block: 'start' });
    const box = source.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = midY('b', 5);
    if (y > innerHeight) throw new Skip('Fenster zu niedrig für diesen Test');
    const scrolled = scrollY;
    touch('touchstart', source, x, midY('a'));
    equal(document.querySelectorAll('.ghost').length, 0, 'Kopien vor dem langen Drücken');
    await wait(LONG_PRESS_MS + 150);
    equal(scrollY, scrolled, 'Greifen am Bildschirmrand scrollt noch nicht');
    assert(source.classList.contains('dragging'), 'Langes Drücken startet das Ziehen');
    equal(document.querySelectorAll('.ghost').length, 1, 'Mitwandernde Kopie');
    assert(touch('touchmove', source, x, y), 'Seite darf beim Ziehen nicht scrollen');
    assert(cardFor('c').classList.contains('drop-before'), 'Einfügelinie vor der nächsten Karte');
    touch('touchend', source, x, y);
    equal(col('offen'), 'bac', 'Reihenfolge nach dem Ablegen');
    equal(document.querySelectorAll('.ghost, .dragging, .over').length, 0, 'Übrig gebliebene Kopien oder Markierungen');
  });

  await test('Wischen und Tippen starten kein Ziehen', async () => {
    if (typeof Touch === 'undefined') throw new Skip('Dieser Browser kann keine Touch-Ereignisse simulieren');
    const source = cardFor('a');
    const box = source.getBoundingClientRect();
    touch('touchstart', source, box.left + 20, box.top + 20);
    assert(!touch('touchmove', source, box.left + 20, box.top + 80), 'Schnelles Wischen muss scrollen dürfen');
    await wait(LONG_PRESS_MS + 50);
    assert(!source.classList.contains('dragging'), 'Wischen darf kein Ziehen starten');
    touch('touchend', source, box.left + 20, box.top + 80);
    touch('touchstart', source, box.left + 20, box.top + 20);
    assert(!touch('touchend', source, box.left + 20, box.top + 20), 'Tippen muss als Klick durchgehen');
    await wait(LONG_PRESS_MS + 50);
    equal(document.querySelectorAll('.ghost, .dragging').length, 0, 'Kopien oder Markierungen');
    equal(col('offen'), 'abc', 'Reihenfolge');
  });

  await test('Löschen und Rückgängig per Knopf', async () => {
    openCard('b');
    await untilClosed(() => $('delete').click());
    equal(confirms.length, 1, 'Sicherheitsabfragen');
    equal(col('offen'), 'ac', 'Nach dem Löschen');
    equal(focused(), 'c', 'Fokus auf der Nachbarkarte');
    equal($('toastText').textContent, '„Firma B“ gelöscht', 'Meldung');
    assert(!$('toast').hidden, 'Meldung ist sichtbar');
    $('undo').click();
    equal(col('offen'), 'abc', 'Nach dem Rückgängigmachen');
    equal(companies.find(c => c.id === 'b').rating, 5, 'Bewertung wiederhergestellt');
    equal(focused(), 'b', 'Fokus auf der wiederhergestellten Karte');
    assert($('toast').hidden, 'Meldung ist wieder weg');
  });

  await test('Rückgängig per Strg+Z', async () => {
    openCard('x');
    await untilClosed(() => $('delete').click());
    assert(!press('z', $('search'), { ctrlKey: true }), 'Strg+Z im Suchfeld gehört dem Textfeld');
    equal(col('fertig'), 'y', 'Im Suchfeld wird nichts wiederhergestellt');
    assert(press('z', document.body, { ctrlKey: true }), 'Strg+Z auf dem Board macht rückgängig');
    equal(col('fertig'), 'xy', 'Nach Strg+Z');
    assert(!press('z', document.body, { ctrlKey: true }), 'Ein zweites Strg+Z tut nichts');
  });

  await test('Abgelehnte Sicherheitsabfrage löscht nichts', async () => {
    confirmAnswer = false;
    openCard('b');
    $('delete').click();
    assert($('dialog').open, 'Dialog bleibt offen');
    equal(companies.length, 5, 'Anzahl Unternehmen');
    equal(saves, 0, 'Speichervorgänge');
  });

  await test('Letzte Karte der Spalte löschen', async () => {
    companies = [mk('a', 'offen', 1)];
    render();
    openCard('a');
    await untilClosed(() => $('delete').click());
    equal(focused(), 'add', 'Fokus auf dem Knopf „+ Unternehmen“');
    equal(columnOf('offen').querySelector('.empty').textContent, 'Karte hierher ziehen', 'Hinweis in der leeren Spalte');
  });

  await test('Spalte nach Bewertung sortieren und rückgängig', () => {
    columnOf('offen').querySelector('.sort').click();
    equal(col('offen'), 'bac', 'Beste Bewertung zuoberst, Gleichstand in alter Reihenfolge');
    equal(col('fertig'), 'xy', 'Andere Spalte unverändert');
    equal($('toastText').textContent, '„Offen“ sortiert', 'Meldung');
    columnOf('offen').querySelector('.sort').click();
    equal(saves, 1, 'Erneutes Sortieren speichert nicht');
    $('undo').click();
    equal(col('offen'), 'abc', 'Vorherige Reihenfolge');
  });

  await test('Suche filtert die Karten', () => {
    companies[1].notes = 'Sonderfall';
    $('search').value = 'sonder';
    $('search').dispatchEvent(new Event('input'));
    equal(col('offen'), 'b', 'Treffer in den Notizen');
    equal(columnOf('fertig').querySelector('.empty').textContent, 'Keine Treffer', 'Hinweis ohne Treffer');
    equal(columnOf('offen').querySelector('.count').textContent, '1', 'Zähler');
    companies[3].url = 'https://beispiel.ch/';
    $('search').value = 'beispiel.ch';
    $('search').dispatchEvent(new Event('input'));
    equal(col('fertig'), 'x', 'Treffer im Link');
    $('search').value = '';
    $('search').dispatchEvent(new Event('input'));
    equal(col('offen'), 'abc', 'Ohne Suchbegriff');
  });

  await test('Filter nach Bewertung', () => {
    const choose = value => {
      $('minRating').value = value;
      $('minRating').dispatchEvent(new Event('change'));
    };
    choose('4');
    equal(col('offen'), 'b', 'Offen ab 4 Sternen');
    equal(col('fertig'), 'y', 'Fertig ab 4 Sternen');
    equal(columnOf('offen').querySelector('.count').textContent, '1', 'Zähler');
    equal(columnOf('arbeit').querySelector('.empty').textContent, 'Keine Treffer', 'Hinweis in der leeren Spalte');
    equal(live(), '2 von 5 Unternehmen angezeigt', 'Ansage');
    choose('5');
    equal(col('offen') + col('fertig'), 'b', 'Nur 5 Sterne');
    choose('2');
    equal(col('offen') + col('fertig'), 'abcy', 'Ab 2 Sternen');
    $('search').value = 'firma c';
    $('search').dispatchEvent(new Event('input'));
    equal(col('offen') + col('fertig'), 'c', 'Filter und Suche zusammen');
    $('search').value = '';
    choose('0');
    equal(col('offen') + col('fertig'), 'abcxy', 'Alle Bewertungen');
    equal(columnOf('arbeit').querySelector('.empty').textContent, 'Karte hierher ziehen', 'Hinweis ohne Filter');
    equal(saves, 0, 'Filtern speichert nichts');
  });

  await test('Export enthält alle Daten und das Datum im Namen', async () => {
    const realCreate = URL.createObjectURL, realClick = HTMLAnchorElement.prototype.click;
    let blob, name;
    URL.createObjectURL = object => { blob = object; return realCreate.call(URL, object); };
    HTMLAnchorElement.prototype.click = function () { name = this.download; };
    try { $('export').click(); } finally {
      URL.createObjectURL = realCreate;
      HTMLAnchorElement.prototype.click = realClick;
    }
    assert(/^research-board-\d{4}-\d{2}-\d{2}\.json$/.test(name), `Dateiname „${name}“`);
    equal(await blob.text(), JSON.stringify(companies, null, 2), 'Inhalt');
  });

  await test('Import führt zusammen', async () => {
    const changed = { ...mk('a', 'fertig', 5), name: 'Alpha neu' };
    await importFile(JSON.stringify([changed, mk('n', 'arbeit', 3)]));
    equal(confirms[0], 'Import: 1 neu, 1 bestehende werden überschrieben. Fortfahren?', 'Rückfrage');
    equal(companies.map(c => c.id).join(''), 'abcxyn', 'Reihenfolge');
    equal(companies[0].name, 'Alpha neu', 'Überschriebener Name');
    equal(col('arbeit'), 'n', 'Neue Karte');
    equal(companies.find(c => c.id === 'b').name, 'Firma B', 'Unbeteiligte Karte');
  });

  await test('Import nach Export ergibt denselben Stand', async () => {
    const exported = JSON.stringify(companies, null, 2);
    companies = [];
    render();
    await importFile(exported);
    equal(JSON.stringify(companies, null, 2), exported, 'Daten');
  });

  await test('Import bereinigt fehlerhafte Einträge', async () => {
    companies = [];
    render();
    await importFile(JSON.stringify([
      { name: '  Nur Name  ' },
      { id: 'm', name: 'Messy', status: 'quatsch', rating: 99, sector: 5, notes: null },
      { id: 'neg', name: 'Negativ', rating: -3 },
      { name: '' }, null, 'text', { sector: 'ohne Name' },
    ]));
    equal(companies.length, 3, 'Übernommene Einträge');
    assert(confirms[0].includes('4 ungültige oder doppelte übersprungen'), `Rückfrage „${confirms[0]}“`);
    equal(JSON.stringify(companies.find(c => c.id === 'm')), JSON.stringify({ id: 'm', name: 'Messy', sector: '', status: 'offen', rating: 5, notes: '', url: '' }), 'Bereinigter Eintrag');
    equal(companies.find(c => c.id === 'neg').rating, 0, 'Negative Bewertung');
    assert(companies[0].id.length > 4, 'Fehlende ID wird erzeugt');
    equal(companies[0].name, 'Nur Name', 'Name ohne Leerzeichen am Rand');
  });

  await test('Import lehnt falsche Dateien ab', async () => {
    for (const text of ['{ kaputt', '{"name":"x"}', '[]', '[{"foo":1}]']) await importFile(text);
    equal(alerts.length, 4, 'Meldungen');
    equal(confirms.length, 0, 'Rückfragen');
    equal(saves, 0, 'Speichervorgänge');
    equal(companies.length, 5, 'Anzahl Unternehmen');
  });

  await test('Abgelehnter Import ändert nichts', async () => {
    confirmAnswer = false;
    await importFile(JSON.stringify([mk('n', 'offen', 1)]));
    equal(companies.length, 5, 'Anzahl Unternehmen');
    equal(saves, 0, 'Speichervorgänge');
  });

  await test('Tastenkürzel-Übersicht', async () => {
    assert(!press('?', $('search')), 'Fragezeichen im Suchfeld gehört dem Textfeld');
    assert(!$('help').open, 'Im Suchfeld öffnet sich nichts');
    press('?', document.body);
    assert($('help').open, 'Fragezeichen öffnet die Übersicht');
    equal($('help').querySelectorAll('dt').length, 7, 'Aufgeführte Kürzel');
    await untilClosed(() => $('help').close(), $('help'));
    $('helpOpen').click();
    assert($('help').open, 'Knopf öffnet die Übersicht');
    await untilClosed(() => $('help').querySelector('form button').click(), $('help'));
    assert(!$('help').open, 'Schliessen-Knopf schliesst');
  });

  await test('Änderungen werden gespeichert und wieder geladen', () => {
    cardFor('a').focus();
    press('ArrowRight');
    press('ArrowDown', cardFor('b'));
    equal(JSON.stringify(stored()), JSON.stringify(companies), 'Gespeicherter Stand');
    equal(JSON.stringify(load()), JSON.stringify(companies), 'Geladener Stand');
  });

  await test('Beschädigte Einträge werden beim Laden übersprungen', () => {
    const raw = JSON.stringify([mk('a', 'offen', 2), { foo: 1 }, null, { id: 'm', name: 'Messy', status: 'quatsch', rating: 99 }, mk('a', 'fertig', 1)]);
    localStorage.setItem(STORAGE_KEY, raw);
    localStorage.removeItem(BACKUP_KEY);
    loadNotice = '';
    const loaded = load();
    equal(loaded.map(c => c.id).join(''), 'am', 'Geladene Einträge');
    equal(JSON.stringify(loaded[1]), JSON.stringify({ id: 'm', name: 'Messy', sector: '', status: 'offen', rating: 5, notes: '', url: '' }), 'Bereinigter Eintrag');
    equal(loaded[0].status, 'fertig', 'Bei doppelter ID gilt der spätere Eintrag');
    equal(localStorage.getItem(BACKUP_KEY), raw, 'Kopie des alten Stands');
    assert(loadNotice.startsWith('3 beschädigte Einträge wurden übersprungen.'), `Hinweis „${loadNotice}“`);
  });

  await test('Unlesbare Daten leeren das Board und werden gesichert', () => {
    for (const raw of ['{ kaputt', '{"name":"x"}', 'null']) {
      localStorage.setItem(STORAGE_KEY, raw);
      localStorage.removeItem(BACKUP_KEY);
      loadNotice = '';
      equal(load().length, 0, `Einträge bei „${raw}“`);
      equal(localStorage.getItem(BACKUP_KEY), raw, 'Kopie des alten Stands');
      assert(loadNotice.startsWith('Die gespeicherten Daten waren unlesbar.'), `Hinweis „${loadNotice}“`);
    }
  });

  await test('Intakte und ältere Daten laden ohne Hinweis', () => {
    const legacy = { id: 'alt', name: 'Altbestand', sector: '', status: 'arbeit', rating: 3, notes: 'ohne Link-Feld' };
    for (const raw of [JSON.stringify(seed()), JSON.stringify([legacy]), '[]']) {
      localStorage.setItem(STORAGE_KEY, raw);
      localStorage.removeItem(BACKUP_KEY);
      loadNotice = '';
      load();
      equal(loadNotice, '', 'Hinweis');
      equal(localStorage.getItem(BACKUP_KEY), null, 'Kopie');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([legacy]));
    equal(JSON.stringify(load()[0]), JSON.stringify({ ...legacy, url: '' }), 'Älterer Eintrag bekommt ein leeres Link-Feld');
    localStorage.removeItem(STORAGE_KEY);
    equal(load().length, 0, 'Leerer Speicher');
    equal(loadNotice, '', 'Hinweis bei leerem Speicher');
  });

  await test('Hinweis bleibt stehen, bis er bestätigt wird', () => {
    offerUndo('Hinweistext');
    assert(!$('toast').hidden, 'Hinweis ist sichtbar');
    equal($('undo').textContent, 'OK', 'Knopf');
    assert(!press('z', document.body, { ctrlKey: true }), 'Strg+Z tut bei einem Hinweis nichts');
    assert(!$('toast').hidden, 'Hinweis bleibt nach Strg+Z');
    $('undo').click();
    assert($('toast').hidden, 'OK schliesst den Hinweis');
    openCard('a');
    $('delete').click();
    equal($('undo').textContent, 'Rückgängig', 'Knopf nach dem Löschen');
  });

  await reset().catch(() => {});
  companies = [];
  loadNotice = '';
  render();
  try {
    localStorage.removeItem(BACKUP_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  window.confirm = realConfirm;
  window.alert = realAlert;
  save = realSave;

  const count = status => results.filter(result => result.status === status).length;
  const summary = `${count('ok')} von ${results.length} Tests bestanden` +
    (count('fail') ? `, ${count('fail')} fehlgeschlagen` : '') + (count('skip') ? `, ${count('skip')} übersprungen` : '');
  const panel = el('div');
  panel.id = 'testResults';
  panel.style.cssText = 'position: fixed; top: 16px; right: 16px; z-index: 30; width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto; padding: 14px 16px; background: var(--panel); border: 2px solid; border-radius: 12px; box-shadow: 0 10px 28px rgba(0, 0, 0, .3); font-size: 13px;';
  panel.style.borderColor = count('fail') ? 'var(--danger)' : 'var(--accent)';
  panel.append(el('h3', '', summary));
  panel.firstChild.style.margin = '0 0 8px';
  const marks = { ok: '✓', fail: '✗', skip: '–' };
  results.forEach(result => {
    const row = el('div', '', `${marks[result.status]} ${result.name}` + (result.detail ? ` — ${result.detail}` : ''));
    if (result.status === 'fail') row.style.color = 'var(--danger)';
    if (result.status === 'skip') row.style.color = 'var(--muted)';
    panel.append(row);
  });
  document.body.append(panel);
  document.title = (count('fail') ? '✗ ' : '✓ ') + summary;
  window.testResults = results;
})();
