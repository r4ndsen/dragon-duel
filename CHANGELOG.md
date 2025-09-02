# Changelog

Alle nennenswerten Änderungen dieses Projekts werden in dieser Datei dokumentiert.

## [Unreleased]
–

## [1.1] - 2025-08-31
### Hinzugefügt
- Upgrade-System mit Bäumen für Arbeiter/Angreifer/Unterkunft inkl. HUD-Anzeige (Effekt + Ressourcensymbol)
- Basis-Upgrades: Reparieren (wiederholbar), Erhöhte Lebensenergie (Max‑HP), Erhöhte Panzerung (Schadensreduktion)
- Einheit: Dieb (Drachen/Ritter) — niedrige HP/Schaden, stiehlt Ressourcen pro Treffer; neue Baubelegung (Drachen `e`, Ritter `i`)
- Einheiten: Fernkampf (Zauberer bei Drachen, Bogenschütze bei Rittern) mit sichtbaren Projektilen und größerer Reichweite
- HUD: Einheiten/Kapazität als `X/Y`, Aufteilung nach Typ (⚔️/🕵️/✨ bzw. 🏹), Häuser/Resourcen als Emoji + Zahl
- Ressourcenrate: Anzeige der Einkünfte pro Sekunde neben 💎/💰 (eine Nachkommastelle)
- Visuelles Feedback: Floating „+2“ für Kills und „+x.x💰“ beim Diebstahl/Hit

### Geändert
- Kampfsystem: Schaden tickt nun in Intervallen (Standard 1/s; Fernkampf 1.5/s)
- Ressourcen-Einkommen: progressive Kurve 1–5: +1/s, 6–9: +0.5/s, ab 10: +0.2/s (monoton steigend)
- Upgrades/UI: „Kosten“ entfernt, nur Ressourcensymbol + Betrag
- Bau-Flow: Kein Bau-Delay mehr für Arbeiter/Unterkünfte (nur Kampfeinheiten haben Cooldown)
- Zielpriorität: Fernkämpfer priorisieren gegnerische Einheiten vor dem Haupthaus

### Behoben
- Dieb-Bau funktioniert nun (eigener Cooldown/Cost-Track)
- Fernkämpfer standen auf falscher Y-Linie und verfehlten Front — auf Lane ausgerichtet

## [1.0] - 2025-08-31
### Hinzugefügt
- Erste spielbare Version (HTML/JS/Canvas)
- Zwei Fraktionen: Drachen (links), Ritter (rechts)
- Einheiten: Angreifer, Arbeiter; Gebäude: Unterkunft (Kapazität)
- Ressourcen: Edelsteine (Drachen), Gold (Ritter); Einkommen 1 pro Arbeiter/Sek.
- Kosten (symmetrisch): Angreifer 4, Arbeiter 6, Unterkunft 12
- Steuerung per Tastaturbereiche (links: qwer/asdf/yxc; rechts: zuio/hjkl/bnm)
- Sieg/Niederlage und Neustart-Overlay

[1.1]: https://example.com/releases/1.1
[1.0]: https://example.com/releases/1.0
