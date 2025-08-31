# Dragon Duel

Ein kleines 2‑Spieler‑Lane-RTS im Browser (HTML5 Canvas). Links steuern die Drachen, rechts die Ritter. Baue Angreifer, Arbeiter und Unterkünfte, verwalte Kapazität und zerstöre die gegnerische Basis.

## Features (v1.0)
- Zwei Fraktionen: Drachen (links) und Ritter (rechts)
- Basis‑HP, Lane‑Bewegung, kontinuierlicher Schaden bei Kontakt
- Einheiten: Angreifer, Arbeiter; Gebäude: Unterkunft (Kapazität)
- Ressourcen: Ritter erzeugen Gold, Drachen Edelsteine (je 1 pro Arbeiter/Sekunde)
- Kosten (symmetrisch): Angreifer 4, Arbeiter 6, Unterkunft 12
- Kapazität: Start 5 Slots, pro Unterkunft +5
- Sieg: Zerstöre die gegnerische Basis

## Steuerung
- Drachen (links)
  - Angreifer: `q w e r`
  - Arbeiter: `a s d f`
  - Unterkunft: `y x c`
- Ritter (rechts)
  - Angreifer: `z u i o`
  - Arbeiter: `h j k l`
  - Unterkunft: `b n m`

## Starten
- Öffne `index.html` direkt im Browser (z. B. per Doppelklick) — es sind keine Abhängigkeiten nötig.
- Nach Spielende: `[Enter]` oder Button „Neustart“.

## Dateien
- `index.html` — Markup und HUD
- `styles.css` — Layout/Styles
- `main.js` — Spiel‑Logik, Rendering, Input

## Ideen für v1.x
- Unterschiedliche Stats/Kosten je Fraktion
- Sichtbare Unterkünfte auf dem Spielfeld (nicht nur HUD)
- Tooltips mit Kosten, Hotkeys im HUD
- Audio/FX und Trefferfeedback
- Balancing und Schwierigkeitskurve
