# Firmen-Research-Board

Ein kleines Kanban-Board, um Unternehmen während der Recherche zu verfolgen. Die ganze App steckt in einer einzigen Datei (`index.html`) und braucht weder Installation noch Server.

## Starten

Im Internet: <https://aretano.github.io/research-board/> – auch auf dem Handy.

Als App: Die Seite in Edge oder Chrome öffnen und über das Menü «Apps → Diese Website als App installieren» (Edge) bzw. «Speichern und teilen → Seite als App installieren» (Chrome) installieren; auf dem Handy «Zum Startbildschirm hinzufügen». Die App hat ein eigenes Fenster und Symbol und startet nach dem ersten Öffnen auch ohne Internet.

Oder lokal: `index.html` im Browser öffnen (Doppelklick genügt).

Die Einträge liegen in beiden Fällen nur im jeweiligen Browser. Die Internet-Adresse und die lokale Datei haben getrennte Daten, ebenso jedes Gerät; zum Übertragen **Export (JSON)** und **Import (JSON)** verwenden.

## Funktionen

- Drei Spalten: **Offen**, **In Arbeit**, **Fertig**
- Unternehmen mit Name, Branche, Bewertung (0–5 Sterne), Link und Notizen erfassen
- Der Link (z. B. Website oder Geschäftsbericht) erscheint auf der Karte und öffnet sich in einem neuen Tab
- Karten per Drag & Drop zwischen den Spalten verschieben – oder die fokussierte Karte mit Pfeil links/rechts
- Karten innerhalb der Spalte umsortieren: per Drag & Drop an die gewünschte Stelle ziehen oder die fokussierte Karte mit Pfeil auf/ab bewegen
- Auf Touchscreens: Karte gedrückt halten, bis sie blasser wird, dann an die gewünschte Stelle ziehen
- Karte anklicken, um sie zu bearbeiten oder zu löschen – oder mit Tab ansteuern und mit Enter bzw. Leertaste öffnen
- Spalte nach Bewertung sortieren: Knopf «★ ↓» im Spaltenkopf, beste Bewertung zuoberst
- Löschen und Sortieren rückgängig machen: 10 Sekunden lang über «Rückgängig» in der Meldung am unteren Rand oder mit Strg+Z
- Übersicht aller Tastenkürzel im Board: Knopf «Tastenkürzel» oder Taste `?`
- Suche über Name, Branche, Notizen und Link
- Filter nach Bewertung: nur Karten ab einer gewählten Sternezahl anzeigen, auch zusammen mit der Suche
- Export aller Einträge als JSON-Datei mit Datum im Namen, z. B. `research-board-2026-10-05.json`
- Import einer solchen JSON-Datei: neue Unternehmen kommen dazu, bereits vorhandene werden nach Rückfrage mit dem Stand aus der Datei überschrieben, alles andere bleibt
- Helles und dunkles Design, je nach Systemeinstellung

## KI-Recherche

Der Knopf **Recherchieren** im Dialog eines Unternehmens lässt Claude im Internet nach dem Unternehmen suchen. Das Ergebnis landet auf der Karte: Branche und Link, sofern diese Felder noch leer sind, und ein Abschnitt «Recherche vom … (Claude)» am Ende der Notizen mit Geschäftsmodell, Kennzahlen, Besonderheiten und Risiken, offenen Fragen und Quellen. Eigene Angaben werden nie überschrieben, und die Übernahme lässt sich 10 Sekunden lang rückgängig machen. Die Bewertung in Sternen bleibt unberührt; Claude gibt keine Anlageempfehlung.

Dafür braucht es einen eigenen Anthropic-API-Schlüssel (getrennt von einem Claude-Abo), den man unter **KI-Recherche** einträgt:

- Der Schlüssel wird nur im `localStorage` dieses Browsers gespeichert (`research-board-claude-key`) und nur an `api.anthropic.com` gesendet. Er ist nicht Teil von Export oder Sicherungskopie und liegt nicht in diesem Repository.
- Wer Zugriff auf dieses Browserprofil hat, kann den Schlüssel auslesen. Auf einem geteilten Gerät den Schlüssel nach Gebrauch wieder löschen und in der Anthropic-Konsole ein Ausgabenlimit setzen.
- Jede Recherche wird dem Anthropic-Konto verrechnet (Modell `claude-opus-5-5` mit Websuche).

Unter **KI-Recherche** lässt sich ausserdem «Täglich um 20.00 Uhr automatisch recherchieren» einschalten. Die App recherchiert dann nacheinander bis zu 10 Karten in «Offen», die noch keine Recherche haben, und meldet am Ende, wie viele es waren. Dafür muss die App um 20.00 Uhr offen sein; wird sie am selben Abend erst später geöffnet, holt sie den Durchlauf nach. Ein verpasster Abend wird am nächsten Tag nicht nachgeholt. Beim ersten Fehler, etwa einem abgelehnten Schlüssel, hört der Durchlauf auf. Mit «Jetzt bis zu 10 Karten recherchieren» lässt sich derselbe Durchlauf jederzeit von Hand starten.

## Tests

`tests.html` im Browser öffnen. Die Seite lädt das Board im Testmodus (`index.html?test`), spielt die wichtigsten Abläufe durch und zeigt nach wenigen Sekunden oben rechts, welche Tests bestanden haben. Der Tab muss dabei sichtbar bleiben; im Hintergrund warten die Tests. Im Testmodus verwendet das Board einen eigenen Speicherschlüssel (`research-board-test`); die echten Einträge bleiben unberührt. Die Tests selbst stehen in `tests.js`.

Auf GitHub laufen dieselben Tests automatisch bei jedem Pull Request (Workflow `.github/workflows/tests.yml`). Das Ergebnis erscheint als Haken oder Kreuz am Pull Request.

Bei jedem Push auf `main` laufen die Tests nochmals; nur wenn sie bestehen, wird die Seite unter <https://aretano.github.io/research-board/> neu veröffentlicht (Workflow `.github/workflows/pages.yml`).

## Daten

Die Einträge werden im `localStorage` des Browsers unter dem Schlüssel `research-board-v1` gespeichert. Sie bleiben also auf diesem Gerät und in diesem Browser; wer die Browserdaten löscht, löscht auch das Board. Beim Öffnen prüft das Board die gespeicherten Daten. Beschädigte Einträge überspringt es und meldet das am unteren Rand; der alte Stand bleibt dann als Kopie unter `research-board-v1-backup` im `localStorage` erhalten. Solange es eine solche Kopie gibt, zeigt das Board den Knopf **Sicherungskopie**: Damit lässt sie sich herunterladen, ihre brauchbaren Einträge lassen sich wieder einspielen (wie ein Import, mit Rückfrage), oder sie lässt sich löschen.

Für eine Sicherung regelmässig **Export (JSON)** verwenden; mit **Import (JSON)** lässt sie sich wieder einlesen, auch in einem anderen Browser oder auf einem anderen Gerät.
