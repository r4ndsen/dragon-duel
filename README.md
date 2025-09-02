# Dragon Duel

Ein kleines, schnelles 2‑Spieler‑Lane‑RTS im Browser (HTML5 Canvas). Links spielen die Drachen, rechts die Ritter. Baue Einheiten, erweitere Kapazität, verbessere deine Seite mit Upgrades und zerstöre die gegnerische Basis.

## Features
- Zwei Fraktionen: Drachen (links) und Ritter (rechts)
- Basis‑Lebenspunkte mit Ringanzeige; HP‑Text erscheint bei Schaden
- Tick‑Combat: Angriffe schlagen in Intervallen zu (Nahkampf 1/s, Fernkampf 1.5/s)
- Einheiten: Angreifer (Nahkampf), Arbeiter (Einkommen), Dieb (stehlt pro Treffer), Fernkämpfer (Zauberer/Bogenschütze) mit sichtbaren Projektilen
- Gebäude: Unterkunft erhöht Kapazität (Start 5, +5 je Unterkunft; Upgrades können Slots erhöhen)
- Ressourcen: Drachen sammeln Edelsteine (💎), Ritter Gold (💰); Einkommen wird pro Sekunde angezeigt
- HUD: Icons für Ressourcen/Häuser, Einheitenübersicht (⚔️/🕵️/✨ bzw. 🏹) und Pop/Cap als `X/Y`

## Wirtschaft
- Einkommen (monoton steigend, abnehmender Grenzertrag):
  - 1–5 Arbeiter: +1/s je Arbeiter
  - 6–9 Arbeiter: +0.5/s je Arbeiter
  - ab 10 Arbeiter: +0.2/s je Arbeiter
- Diebe: erhalten bei jedem Treffer Ressourcen aus dem Gegner‑Pool (Floater „+x.x💰“), zusätzlich gibt jeder Kill noch +2 Ressourcen
- Kills (alle Einheiten): +2 Ressourcen für die Seite, die tötet

## Upgrades
- Fraktions‑Upgrades (Tasten):
  - Drachen: `q` (Angreifer‑Schaden), `a` (Arbeiter‑Einkommen), `y` (Unterkunft‑Slots)
  - Ritter: `z` (Angreifer‑Schaden), `h` (Arbeiter‑Einkommen), `b` (Unterkunft‑Slots)
- Basis‑Upgrades (per Klick im HUD):
  - Reparieren (⛨): wiederholbar, heilt sofort um einen festen Wert
  - Erhöhte Lebensenergie (❤): erhöht Max‑HP (heilt um den Bonus)
  - Erhöhte Panzerung (🛡️): verringert eingehenden Basisschaden

## Steuerung (Bauen)
- Drachen (links):
  - Angreifer: `w`
  - Dieb: `e`
  - Zauberer (Fernkampf): `r`
  - Arbeiter: `s d f`
  - Unterkunft: `x c`
- Ritter (rechts):
  - Angreifer: `u`
  - Dieb: `i`
  - Bogenschütze (Fernkampf): `o`
  - Arbeiter: `j k l`
  - Unterkunft: `n m`

Hinweise
- Arbeiter/Unterkunft haben kein Bau‑Delay; Kampfeinheiten haben eine kurze Abklingzeit
- Fernkämpfer priorisieren Einheiten vor der Basis und feuern sichtbare Projektile
- Basispanzerung reduziert Schaden; Reparieren ist beliebig oft möglich

## Kosten (Standard)
- Drachen (💎) / Ritter (💰):
  - Angreifer: 4
  - Dieb: 6
  - Zauberer/Bogenschütze: 8
  - Arbeiter: 6
  - Unterkunft: 12

## Starten
- Öffne `index.html` direkt im Browser (Doppelklick). Keine Abhängigkeiten erforderlich.
- Neustart nach Sieg/Niederlage: `[Enter]` oder Button „Neustart“.

## Dateien
- `index.html` — Markup und HUD
- `styles.css` — Layout/Styles
- `main.js` — Spiel‑Logik, Rendering, Input

## Ideen / Nächste Schritte
- Unterschiedliche Stats/Kosten je Fraktion, visuelle Treffer‑Effekte/Trails
- Tooltips mit genauen Upgrade‑Werten im HUD
- Soundeffekte, Balancing‑Feinschliff
