# Firmen-Research-Board

Ein kleines Kanban-Board, um Unternehmen während der Recherche zu verfolgen. Die ganze App steckt in einer einzigen Datei (`index.html`) und braucht weder Installation noch Server.

## Starten

`index.html` im Browser öffnen (Doppelklick genügt).

## Funktionen

- Drei Spalten: **Offen**, **In Arbeit**, **Fertig**
- Unternehmen mit Name, Branche, Bewertung (0–5 Sterne) und Notizen erfassen
- Karten per Drag & Drop zwischen den Spalten verschieben
- Karte anklicken, um sie zu bearbeiten oder zu löschen
- Suche über Name, Branche und Notizen
- Export aller Einträge als `research-board.json`
- Helles und dunkles Design, je nach Systemeinstellung

## Daten

Die Einträge werden im `localStorage` des Browsers unter dem Schlüssel `research-board-v1` gespeichert. Sie bleiben also auf diesem Gerät und in diesem Browser; wer die Browserdaten löscht, löscht auch das Board. Für eine Sicherung regelmässig **Export (JSON)** verwenden.
