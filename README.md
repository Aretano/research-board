# Firmen-Research-Board

Ein kleines Kanban-Board, um Unternehmen während der Recherche zu verfolgen. Die ganze App steckt in einer einzigen Datei (`index.html`) und braucht weder Installation noch Server.

## Starten

`index.html` im Browser öffnen (Doppelklick genügt).

## Funktionen

- Drei Spalten: **Offen**, **In Arbeit**, **Fertig**
- Unternehmen mit Name, Branche, Bewertung (0–5 Sterne) und Notizen erfassen
- Karten per Drag & Drop zwischen den Spalten verschieben – oder die fokussierte Karte mit Pfeil links/rechts
- Karten innerhalb der Spalte umsortieren: per Drag & Drop an die gewünschte Stelle ziehen oder die fokussierte Karte mit Pfeil auf/ab bewegen
- Auf Touchscreens: Karte gedrückt halten, bis sie blasser wird, dann an die gewünschte Stelle ziehen
- Karte anklicken, um sie zu bearbeiten oder zu löschen – oder mit Tab ansteuern und mit Enter bzw. Leertaste öffnen
- Suche über Name, Branche und Notizen
- Export aller Einträge als JSON-Datei mit Datum im Namen, z. B. `research-board-2026-10-05.json`
- Import einer solchen JSON-Datei: neue Unternehmen kommen dazu, bereits vorhandene werden nach Rückfrage mit dem Stand aus der Datei überschrieben, alles andere bleibt
- Helles und dunkles Design, je nach Systemeinstellung

## Daten

Die Einträge werden im `localStorage` des Browsers unter dem Schlüssel `research-board-v1` gespeichert. Sie bleiben also auf diesem Gerät und in diesem Browser; wer die Browserdaten löscht, löscht auch das Board. Für eine Sicherung regelmässig **Export (JSON)** verwenden; mit **Import (JSON)** lässt sie sich wieder einlesen, auch in einem anderen Browser oder auf einem anderen Gerät.
