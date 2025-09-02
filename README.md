# Dragon Duel

A small, fast 2‑player lane RTS in the browser (HTML5 Canvas). Dragons (left) fight Knights (right). Build units, expand capacity, purchase upgrades, and destroy the enemy base.

## Features
- Two factions: Dragons (left) and Knights (right)
- Base HP ring with numeric overlay when damaged
- Tick combat: melee attacks at 1/sec, ranged at ~1/1.5 sec
- Units: Attacker (melee), Worker (income), Thief (steals on hit), Ranged (Wizard/Archer) with visible projectiles
- Buildings: House increases population cap (start 5, +5 per house; house upgrades add extra slots)
- Resources: Dragons collect gems (💎), Knights collect gold (💰); income/sec shown in HUD
- HUD: Resource/house icons, unit breakdown (⚔️/🕵️/✨ or 🏹), and pop/cap as `X/Y`
- Language selector: flag dropdown at the top‑right (English/Deutsch), persists via localStorage

## Economy
- Worker income (monotonic with diminishing returns):
  - 1–5 workers: +1/sec each
  - 6–9 workers: +0.5/sec each
  - 10+ workers: +0.2/sec each
- Thieves steal from the enemy pool on every successful hit (floating text shows “+x.x💰”), and all unit kills grant +2 resources to the killer’s side
- Start with 1 free worker per side

## Upgrades
- Faction upgrades (keys):
  - Dragons: `q` (Attacker damage), `a` (Worker income), `y` (House slots)
  - Knights: `z` (Attacker damage), `h` (Worker income), `b` (House slots)
- Base upgrades (click):
  - Repair (⛨): repeatable, heals a fixed amount instantly
  - Max HP (❤): increases base max HP (also heals by the bonus)
  - Armor (🛡️): reduces incoming base damage
- Tip: Click a base on the canvas to open a floating base‑upgrade panel with the same actions.

## Controls (Build)
- Dragons (left):
  - Attacker: `w`
  - Thief: `e`
  - Wizard (ranged): `r`
  - Worker: `s d f`
  - House: `x c`
- Knights (right):
  - Attacker: `u`
  - Thief: `i`
  - Archer (ranged): `o`
  - Worker: `j k l`
  - House: `n m`

Notes
- Build cooldowns: Attacker 250ms, Thief 250ms, Ranged 300ms, Worker 100ms, House 100ms
- Ranged units prioritize enemy units before the base and fire visible projectiles
- Base armor reduces damage; Repair is repeatable

## Costs (default)
- Dragons (💎) / Knights (💰):
  - Attacker: 4
  - Thief: 6
  - Wizard/Archer: 8
  - Worker: 6
  - House: 12

## Run
- Open `index.html` directly in a browser (no dependencies)
- Restart after win/lose: press `[Enter]` or click “Restart”

## Files
- `index.html` — HUD and markup
- `styles.css` — Layout and styles
- `main.js` — Game logic, rendering, input, i18n

## Ideas / Next steps
- Distinct stats/costs per faction; hit effects/trails
- Tooltips with precise upgrade values in HUD
- Sound effects; balance polish
