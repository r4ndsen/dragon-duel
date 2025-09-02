// Dragon Duel - minimal 2P RTS prototype

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const HUD = {
  dragonHP: document.getElementById('dragon-hp'),
  dragonRes: document.getElementById('dragon-res'),
  dragonResRate: document.getElementById('dragon-res-rate'),
  dragonHouses: document.getElementById('dragon-houses'),
  dragonPopCap: document.getElementById('dragon-popcap'),
  dragonAttackers: document.getElementById('dragon-attackers'),
  dragonWorkers: document.getElementById('dragon-workers'),
  dragonUpgAtk: document.getElementById('dragon-upg-attack'),
  dragonUpgWkr: document.getElementById('dragon-upg-worker'),
  dragonUpgHse: document.getElementById('dragon-upg-house'),
  dragonUpgBaseRepair: document.getElementById('dragon-upg-base-repair'),
  dragonUpgBaseHP: document.getElementById('dragon-upg-base-hp'),
  dragonUpgBaseArmor: document.getElementById('dragon-upg-base-armor'),
  knightHP: document.getElementById('knight-hp'),
  knightRes: document.getElementById('knight-res'),
  knightResRate: document.getElementById('knight-res-rate'),
  knightHouses: document.getElementById('knight-houses'),
  knightPopCap: document.getElementById('knight-popcap'),
  knightAttackers: document.getElementById('knight-attackers'),
  knightWorkers: document.getElementById('knight-workers'),
  knightUpgAtk: document.getElementById('knight-upg-attack'),
  knightUpgWkr: document.getElementById('knight-upg-worker'),
  knightUpgHse: document.getElementById('knight-upg-house'),
  knightUpgBaseRepair: document.getElementById('knight-upg-base-repair'),
  knightUpgBaseHP: document.getElementById('knight-upg-base-hp'),
  knightUpgBaseArmor: document.getElementById('knight-upg-base-armor'),
};

const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restart');
let basePanel = null; // floating panel element
let selectedBase = null; // 'dragon' | 'knight' | null

// i18n utilities
const I18N = window.I18N || {};
let CURRENT_LANG = (localStorage.getItem('lang') || 'de');
function t(key, params) {
  const dict = (I18N[CURRENT_LANG] || I18N.de || {});
  let s = dict[key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.replaceAll(`{${k}}`, String(v));
    }
  }
  return s;
}
function setLang(lang) {
  CURRENT_LANG = lang in I18N ? lang : 'de';
  localStorage.setItem('lang', CURRENT_LANG);
  applyI18n();
}
window.setLang = setLang; // expose for debugging/switching
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) el.setAttribute('title', t(key));
  });
}

// Base upgrade floating panel
function ensureBasePanel() {
  if (basePanel) return basePanel;
  basePanel = document.createElement('div');
  basePanel.className = 'base-panel';
  basePanel.innerHTML = `
    <h2 id="base-panel-title">Basis</h2>
    <div class="row" id="row-repair"><span class="icon">⛨</span><span class="desc">–</span></div>
    <div class="row" id="row-hp"><span class="icon">❤</span><span class="desc">–</span></div>
    <div class="row" id="row-armor"><span class="icon">🛡️</span><span class="desc">–</span></div>
  `;
  document.body.appendChild(basePanel);
  basePanel.addEventListener('click', (e) => {
    const target = e.target.closest('.row');
    if (!target) return;
    if (!selectedBase) return;
    if (target.id === 'row-repair') tryUpgradeBase(selectedBase, 'base-repair');
    if (target.id === 'row-hp') tryUpgradeBase(selectedBase, 'base-hp');
    if (target.id === 'row-armor') tryUpgradeBase(selectedBase, 'base-armor');
    updateBasePanel();
  });
  document.addEventListener('click', (e) => {
    if (!basePanel) return;
    const withinPanel = e.target === basePanel || basePanel.contains(e.target);
    const withinCanvas = e.target === canvas;
    if (!withinPanel && !withinCanvas) closeBasePanel();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBasePanel();
  });
  return basePanel;
}

function openBasePanel(side) {
  ensureBasePanel();
  selectedBase = side;
  basePanel.classList.toggle('right', side === 'knight');
  document.getElementById('base-panel-title').textContent = `${t(side==='dragon'?'app.dragons':'app.knights')} – ${t('controls.upgradesLabel').replace(/:$/,'')}`;
  updateBasePanel();
}

function updateBasePanel() {
  if (!basePanel || !selectedBase) return;
  const labels = baseText(selectedBase);
  basePanel.querySelector('#row-repair .desc').textContent = labels.repair;
  basePanel.querySelector('#row-hp .desc').textContent = labels.hp;
  basePanel.querySelector('#row-armor .desc').textContent = labels.armor;
}

function closeBasePanel() {
  selectedBase = null;
  if (basePanel) basePanel.remove();
  basePanel = null;
}

// Config (tuned for simple fun)
const CONFIG = {
  baseHP: 500,
  baseRadius: 28,
  laneY: canvas.height / 2,
  leftBaseX: 60,
  rightBaseX: canvas.width - 60,
  attacker: {
    hp: 40,
    speed: 60, // px per second
    dps: 10,
    range: 22,
    size: 10,
    buildCooldown: 250, // ms
  },
  ranged: {
    // Generic ranged baseline; skinned as Wizard (dragon) or Archer (knight)
    hp: 18,
    speed: 58,
    dps: 8,
    range: 140,
    size: 9,
    attackInterval: 1.5, // slower than 1/s
    buildCooldown: 300,
  },
  thief: {
    hp: 24,
    speed: 72,
    dps: 6,
    range: 18,
    size: 9,
    stealOnHit: 1.2,
    buildCooldown: 250,
  },
  worker: {
    hp: 25,
    size: 7,
    buildCooldown: 100,
  },
  housing: {
    slotsPerHouse: 5,
    initialSlots: 5,
    buildCooldown: 100,
  },
  houseIconSpacing: 9,
  income: {
    workerPerSec: 1,
  },
  costs: {
    // symmetric costs for first iteration
    dragon: { attacker: 4, thief: 6, wizard: 8, worker: 6, house: 12 }, // Edelsteine
    knight: { attacker: 4, thief: 6, archer: 8, worker: 6, house: 12 }, // Gold
  },
  upgrades: {
    // Upgrade definitions per category; indices are levels (0-based before purchase)
    worker: [
      { name: 'Schaufeln I', incomeMult: 1.25, cost: 12 },
      { name: 'Schaufeln II', incomeMult: 1.5, cost: 24 },
      { name: 'Schaufeln III', incomeMult: 2.0, cost: 48 },
    ],
    attacker: [
      { name: 'Schärfere Klauen/Schwerter I', dpsMult: 1.25, cost: 14 },
      { name: 'Schärfere Klauen/Schwerter II', dpsMult: 1.5, cost: 28 },
      { name: 'Schärfere Klauen/Schwerter III', dpsMult: 2.0, cost: 56 },
    ],
    house: [
      { name: 'Doppelbetten I', slotsBonus: 1, cost: 16 },
      { name: 'Doppelbetten II', slotsBonus: 2, cost: 32 },
    ],
    baseRepair: [
      { amount: 120, cost: 16 },
      { amount: 180, cost: 28 },
      { amount: 260, cost: 40 },
    ],
    baseHP: [
      { bonus: 200, cost: 24 },
      { bonus: 300, cost: 40 },
    ],
    baseArmor: [
      { add: 0.1, cost: 20 },
      { add: 0.1, cost: 35 },
      { add: 0.1, cost: 55 },
    ],
  }
};

// Utility
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Upkeep scales within tier so small worker counts still produce.
// Example: 1..5 workers cost up to 1 total (linearly), 6..10 up to 2, then doubles per 5.
// Progressive income curve per worker index (monotonic, diminishing returns):
// 1st worker = +1/s; 2nd-4th = +1/s; 5th-9th = +0.5/s; 10th+ = +0.2/s
function workerIncomeBase(count) {
  let total = 0;
  for (let i = 1; i <= count; i++) {
    if (i >= 10) total += 0.2; // 10+
    else if (i >= 6) total += 0.5; // 6..9
    else total += 1; // 1..5
  }
  return total;
}

class Entity {
  constructor({ side }) {
    this.side = side; // 'dragon' | 'knight'
    this.alive = true;
    this.hp = 1;
  }
  takeDamage(dmg, source, world) {
    if (!this.alive) return;
    this.hp -= dmg;
    if (this.hp <= 0) {
      this.alive = false;
      // Kill bounty: +2 Ressourcen an Angreifer-Seite für Einheiten-Kills
      if (this.type === 'attacker' || this.type === 'worker' || this.type === 'thief' || this.type === 'ranged') {
        // Generic kill bonus (minted) for all killers
        const killerSide = source?.side;
        if (killerSide === 'dragon') {
          world.resources.dragon.gems += 2;
          spawnFloater(world, this.x, this.y - 14, '+2💎', '#f472b6');
        } else if (killerSide === 'knight') {
          world.resources.knight.gold += 2;
          spawnFloater(world, this.x, this.y - 14, '+2💰', '#4fd1c5');
        }
      }
    }
  }
}

class Attacker extends Entity {
  constructor(side) {
    super({ side });
    this.type = 'attacker';
    this.hp = CONFIG.attacker.hp;
    this.size = CONFIG.attacker.size;
    this.x = side === 'dragon' ? CONFIG.leftBaseX + CONFIG.baseRadius + 4 : CONFIG.rightBaseX - CONFIG.baseRadius - 4;
    this.y = CONFIG.laneY + (Math.random() * 6 - 3);
    this.target = null;
    this.atkTimer = 0; // seconds until next attack (1/s default)
  }
  update(dt, world) {
    if (!this.alive) return;
    const dir = this.side === 'dragon' ? 1 : -1;
    const dpsMult = world.upgrades[this.side].attacker > 0 ? CONFIG.upgrades.attacker[world.upgrades[this.side].attacker - 1].dpsMult : 1;
    this.atkTimer -= dt;

    // Acquire target: prioritize enemy attackers in range
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of world.entities) {
      if (!e.alive) continue;
      if (!(e.type === 'attacker' || e.type === 'thief' || e.type === 'ranged')) continue;
      if (e.side === this.side) continue;
      const d = Math.abs(e.x - this.x);
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }

    const baseX = this.side === 'dragon' ? CONFIG.rightBaseX : CONFIG.leftBaseX;
    const inRangeOfEnemy = nearest && Math.abs(nearest.x - this.x) <= CONFIG.attacker.range + this.size;

    if (inRangeOfEnemy) {
      // Attack enemy frontline units (tick-based)
      if (this.atkTimer <= 0) {
        nearest.takeDamage(CONFIG.attacker.dps * dpsMult, { side: this.side, type: 'attacker' }, world);
        this.atkTimer = 1; // 1 attack per second
      }
    } else {
      // Move towards enemy base
      const v = CONFIG.attacker.speed * dt * dir;
      const stopAt = this.side === 'dragon'
        ? (CONFIG.rightBaseX - (CONFIG.baseRadius + this.size))
        : (CONFIG.leftBaseX + (CONFIG.baseRadius + this.size));
      if (dir > 0) this.x = Math.min(this.x + v, stopAt);
      else this.x = Math.max(this.x + v, stopAt);
    }

    // Attack enemy base if reached
    const distToBase = Math.abs(baseX - this.x);
    if (distToBase <= CONFIG.baseRadius + this.size) {
      if (this.atkTimer <= 0) {
        if (this.side === 'dragon') {
          const armor = world.baseArmor.knight || 0;
          const dmg = CONFIG.attacker.dps * dpsMult * (1 - armor);
          world.knightBaseHP = Math.max(0, world.knightBaseHP - dmg);
        } else {
          const armor = world.baseArmor.dragon || 0;
          const dmg = CONFIG.attacker.dps * dpsMult * (1 - armor);
          world.dragonBaseHP = Math.max(0, world.dragonBaseHP - dmg);
        }
        this.atkTimer = 1;
      }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.side === 'dragon' ? '#f472b6' : '#4fd1c5';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    // HP bar
    const max = CONFIG.attacker.hp;
    const w = 18, h = 3;
    ctx.fillStyle = '#00000099';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, w, h);
    ctx.fillStyle = this.side === 'dragon' ? '#ff9dcf' : '#9cf2ea';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, (w * clamp(this.hp / max, 0, 1)), h);
    ctx.restore();
  }
}

class Worker extends Entity {
  constructor(side) {
    super({ side });
    this.type = 'worker';
    this.hp = CONFIG.worker.hp;
    this.size = CONFIG.worker.size;
    this.x = side === 'dragon' ? CONFIG.leftBaseX + CONFIG.baseRadius + 8 : CONFIG.rightBaseX - CONFIG.baseRadius - 8;
    this.y = CONFIG.laneY + 28 + (Math.random() * 12 - 6);
  }
  update() {}
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.side === 'dragon' ? '#facc15' : '#34d399';
    ctx.beginPath();
    ctx.rect(this.x - this.size, this.y - this.size, this.size * 2, this.size * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Thief extends Entity {
  constructor(side) {
    super({ side });
    this.type = 'thief';
    this.hp = CONFIG.thief.hp;
    this.size = CONFIG.thief.size;
    this.x = side === 'dragon' ? CONFIG.leftBaseX + CONFIG.baseRadius + 6 : CONFIG.rightBaseX - CONFIG.baseRadius - 6;
    this.y = CONFIG.laneY - 28 + (Math.random() * 12 - 6);
    this.atkTimer = 0;
  }
  update(dt, world) {
    if (!this.alive) return;
    const dir = this.side === 'dragon' ? 1 : -1;
    const dpsMult = world.upgrades[this.side].attacker > 0 ? CONFIG.upgrades.attacker[world.upgrades[this.side].attacker - 1].dpsMult : 1;
    this.atkTimer -= dt;

    // find nearest enemy attacker (like attacker behavior)
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of world.entities) {
      if (!e.alive) continue;
      if (e.type !== 'attacker' && e.type !== 'thief') continue;
      if (e.side === this.side) continue;
      const d = Math.abs(e.x - this.x);
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }
    const baseX = this.side === 'dragon' ? CONFIG.rightBaseX : CONFIG.leftBaseX;
    const inRangeOfEnemy = nearest && Math.abs(nearest.x - this.x) <= CONFIG.thief.range + this.size;

    if (inRangeOfEnemy) {
      if (this.atkTimer <= 0) {
        nearest.takeDamage(CONFIG.thief.dps * dpsMult, { side: this.side, type: 'thief' }, world);
        // Steal on each successful hit
        stealFromEnemy(this.side, CONFIG.thief.stealOnHit, world, this.x, this.y);
        this.atkTimer = 1;
      }
    } else {
      const v = CONFIG.thief.speed * dt * dir;
      const stopAt = this.side === 'dragon'
        ? (CONFIG.rightBaseX - (CONFIG.baseRadius + this.size))
        : (CONFIG.leftBaseX + (CONFIG.baseRadius + this.size));
      if (dir > 0) this.x = Math.min(this.x + v, stopAt);
      else this.x = Math.max(this.x + v, stopAt);
    }

    const distToBase = Math.abs(baseX - this.x);
    if (distToBase <= CONFIG.baseRadius + this.size) {
      if (this.atkTimer <= 0) {
        // damage base (reduced by armor)
        const armor = this.side === 'dragon' ? (world.baseArmor.knight || 0) : (world.baseArmor.dragon || 0);
        const dmg = CONFIG.thief.dps * dpsMult * (1 - armor);
        if (this.side === 'dragon') {
          world.knightBaseHP = Math.max(0, world.knightBaseHP - dmg);
          // Steal on base hit too
          stealFromEnemy(this.side, CONFIG.thief.stealOnHit, world, this.x, this.y);
        } else {
          world.dragonBaseHP = Math.max(0, world.dragonBaseHP - dmg);
          stealFromEnemy(this.side, CONFIG.thief.stealOnHit, world, this.x, this.y);
        }
        this.atkTimer = 1;
      }
    }
  }
  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.side === 'dragon' ? '#f59e0b' : '#22c55e';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    const max = CONFIG.thief.hp;
    const w = 16, h = 3;
    ctx.fillStyle = '#00000099';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, w, h);
    ctx.fillStyle = this.side === 'dragon' ? '#fde68a' : '#86efac';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, (w * clamp(this.hp / max, 0, 1)), h);
    ctx.restore();
  }
}

class Ranged extends Entity {
  constructor(side) {
    super({ side });
    this.type = 'ranged';
    this.hp = CONFIG.ranged.hp;
    this.size = CONFIG.ranged.size;
    this.x = side === 'dragon' ? CONFIG.leftBaseX + CONFIG.baseRadius + 6 : CONFIG.rightBaseX - CONFIG.baseRadius - 6;
    // Stay on the main lane so projectiles can connect with frontline units
    this.y = CONFIG.laneY + (Math.random() * 6 - 3);
    this.atkTimer = 0;
  }
  update(dt, world) {
    if (!this.alive) return;
    const dir = this.side === 'dragon' ? 1 : -1;
    const dpsMult = world.upgrades[this.side].attacker > 0 ? CONFIG.upgrades.attacker[world.upgrades[this.side].attacker - 1].dpsMult : 1;
    this.atkTimer -= dt;

    // Target selection among combat units
    let nearest = null, nearestDist = Infinity;
    for (const e of world.entities) {
      if (!e.alive) continue;
      if (!(e.type === 'attacker' || e.type === 'thief' || e.type === 'ranged')) continue;
      if (e.side === this.side) continue;
      const d = Math.abs(e.x - this.x);
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }
    const baseX = this.side === 'dragon' ? CONFIG.rightBaseX : CONFIG.leftBaseX;
    const inRangeOfEnemy = nearest && Math.abs(nearest.x - this.x) <= CONFIG.ranged.range;

    if (inRangeOfEnemy) {
      if (this.atkTimer <= 0) {
        spawnProjectile(world, this.side, this.x, this.y, dir, CONFIG.ranged.dps * dpsMult, this.side === 'dragon' ? '#a78bfa' : '#93c5fd');
        this.atkTimer = CONFIG.ranged.attackInterval;
      }
    } else {
      // advance while keeping preferred distance
      const v = CONFIG.ranged.speed * dt * dir;
      const stopAt = this.side === 'dragon'
        ? (CONFIG.rightBaseX - (CONFIG.baseRadius + CONFIG.ranged.range))
        : (CONFIG.leftBaseX + (CONFIG.baseRadius + CONFIG.ranged.range));
      if (dir > 0) this.x = Math.min(this.x + v, stopAt);
      else this.x = Math.max(this.x + v, stopAt);
    }

    // Attack base if within range
    const distToBase = Math.abs(baseX - this.x);
    // Only attack base if not already engaging a unit in range
    if (!inRangeOfEnemy && distToBase <= CONFIG.baseRadius + CONFIG.ranged.range) {
      if (this.atkTimer <= 0) {
        spawnProjectile(world, this.side, this.x, this.y, dir, CONFIG.ranged.dps * dpsMult, this.side === 'dragon' ? '#a78bfa' : '#93c5fd');
        this.atkTimer = CONFIG.ranged.attackInterval;
      }
    }
  }
  draw(ctx) {
    ctx.save();
    // color per side and role
    ctx.fillStyle = this.side === 'dragon' ? '#a78bfa' : '#93c5fd';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
    ctx.fill();
    const max = CONFIG.ranged.hp;
    const w = 16, h = 3;
    ctx.fillStyle = '#00000099';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, w, h);
    ctx.fillStyle = this.side === 'dragon' ? '#ddd6fe' : '#bfdbfe';
    ctx.fillRect(this.x - w/2, this.y - this.size - 7, (w * clamp(this.hp / max, 0, 1)), h);
    ctx.restore();
  }
}
function stealFromEnemy(side, amount, world, x, y) {
  if (amount <= 0) return;
  if (side === 'dragon') {
    // Dragons steal from knights (gold)
    const take = Math.min(world.resources.knight.gold, amount);
    if (take > 0) {
      world.resources.knight.gold -= take;
      world.resources.dragon.gems += take; // convert to own currency magnitude
      // Show gold icon on steal as requested
      spawnFloater(world, x, y - 14, `+${take.toFixed(1)}💰`, '#f59e0b');
    }
  } else {
    // Knights steal from dragons (gems)
    const take = Math.min(world.resources.dragon.gems, amount);
    if (take > 0) {
      world.resources.dragon.gems -= take;
      world.resources.knight.gold += take; // convert to own currency magnitude
      spawnFloater(world, x, y - 14, `+${take.toFixed(1)}💰`, '#22c55e');
    }
  }
}

class World {
  constructor() {
    this.entities = [];
    this.dragonBaseMaxHP = CONFIG.baseHP;
    this.knightBaseMaxHP = CONFIG.baseHP;
    this.dragonBaseHP = CONFIG.baseHP;
    this.knightBaseHP = CONFIG.baseHP;
    this.baseArmor = { dragon: 0, knight: 0 };
    this.houses = { dragon: 0, knight: 0 };
    this.resources = { dragon: { gems: 0 }, knight: { gold: 0 } };
    this.upgrades = {
      dragon: { worker: 0, attacker: 0, house: 0, baseRepair: 0, baseHP: 0, baseArmor: 0 },
      knight: { worker: 0, attacker: 0, house: 0, baseRepair: 0, baseHP: 0, baseArmor: 0 },
    };
    this.floaters = [];
    this.projectiles = [];
    this.cooldowns = {
      dragon: { attacker: 0, worker: 0, house: 0 },
      knight: { attacker: 0, worker: 0, house: 0 },
    };
    this.ended = false;
  }
  reset() {
    this.entities = [];
    this.dragonBaseMaxHP = CONFIG.baseHP;
    this.knightBaseMaxHP = CONFIG.baseHP;
    this.dragonBaseHP = CONFIG.baseHP;
    this.knightBaseHP = CONFIG.baseHP;
    this.baseArmor = { dragon: 0, knight: 0 };
    this.houses = { dragon: 0, knight: 0 };
    this.resources = { dragon: { gems: 0 }, knight: { gold: 0 } };
    this.upgrades = {
      dragon: { worker: 0, attacker: 0, house: 0, baseRepair: 0, baseHP: 0, baseArmor: 0 },
      knight: { worker: 0, attacker: 0, house: 0, baseRepair: 0, baseHP: 0, baseArmor: 0 },
    };
    this.floaters = [];
    this.projectiles = [];
    this.cooldowns = {
      dragon: { attacker: 0, worker: 0, house: 0 },
      knight: { attacker: 0, worker: 0, house: 0 },
    };
    this.ended = false;
    // Start with 1 worker each (free at game start)
    this.entities.push(new Worker('dragon'));
    this.entities.push(new Worker('knight'));
  }
  capacity(side) {
    const lvl = this.upgrades[side].house;
    const bonus = lvl > 0 ? CONFIG.upgrades.house[lvl - 1].slotsBonus : 0;
    return CONFIG.housing.initialSlots + this.houses[side] * (CONFIG.housing.slotsPerHouse + bonus);
  }
  population(side) {
    return this.entities.filter(e => e.alive && e.side === side && (e.type === 'attacker' || e.type === 'worker' || e.type === 'thief')).length;
  }
  canAddUnit(side) {
    return this.population(side) < this.capacity(side);
  }
}

const world = new World();
// Ensure starting workers exist on initial load
world.reset();

// Input mappings per spec (German layout friendly)
const dragonKeys = {
  attacker: new Set(['q','w','e','r']),
  worker: new Set(['a','s','d','f']),
  house: new Set(['y','x','c']),
};
const knightKeys = {
  attacker: new Set(['z','u','i','o']),
  worker: new Set(['h','j','k','l']),
  house: new Set(['b','n','m']),
};

function tryBuild(side, kind) {
  if (world.ended) return;
  const nowCooldowns = world.cooldowns[side];
  const now = performance.now();
  // Simple per-kind cooldown stored as next-allowed timestamp
  if (!nowCooldowns._ts) nowCooldowns._ts = { attacker: 0, thief: 0, wizard: 0, archer: 0, worker: 0, house: 0 };
  const ts = nowCooldowns._ts;
  const cdMap = { attacker: CONFIG.attacker.buildCooldown, thief: CONFIG.thief.buildCooldown, wizard: CONFIG.ranged.buildCooldown, archer: CONFIG.ranged.buildCooldown, worker: CONFIG.worker.buildCooldown, house: CONFIG.housing.buildCooldown };
  // Per-kind cooldown checks
  if (kind === 'attacker' && now < ts.attacker) return;
  if (kind === 'thief' && now < ts.thief) return;
  if ((kind === 'wizard' && now < ts.wizard) || (kind === 'archer' && now < ts.archer)) return;
  if (kind === 'worker' && now < ts.worker) return;
  if (kind === 'house' && now < ts.house) return;

  // Resource check and deduction
  const sideCosts = CONFIG.costs[side];
  const cost = sideCosts[kind] ?? 0;
  const have = side === 'dragon' ? world.resources.dragon.gems : world.resources.knight.gold;
  if (have < cost) return; // not enough resources

  if (kind === 'house') {
    world.houses[side] += 1;
    if (side === 'dragon') world.resources.dragon.gems -= cost;
    else world.resources.knight.gold -= cost;
    // apply small cooldown for house builds
    ts.house = now + cdMap.house;
    return;
  }

  if (!world.canAddUnit(side)) return;

  if (kind === 'attacker') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Attacker(side));
  } else if (kind === 'thief') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Thief(side));
  } else if (kind === 'wizard' || kind === 'archer') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Ranged(side));
  } else if (kind === 'worker') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Worker(side));
  }
  if (kind === 'attacker') ts.attacker = now + cdMap.attacker; // keep attacker cooldown
  if (kind === 'thief') ts.thief = now + cdMap.thief; // cooldown for thief
  if (kind === 'wizard') ts.wizard = now + cdMap.wizard;
  if (kind === 'archer') ts.archer = now + cdMap.archer;
  if (kind === 'worker') ts.worker = now + cdMap.worker;
}

function tryUpgrade(side, category) {
  if (world.ended) return;
  const lvl = world.upgrades[side][category];
  const tree = CONFIG.upgrades[category];
  if (lvl >= tree.length) return; // maxed
  const cost = tree[lvl].cost;
  if (side === 'dragon') {
    if (world.resources.dragon.gems < cost) return;
    world.resources.dragon.gems -= cost;
  } else {
    if (world.resources.knight.gold < cost) return;
    world.resources.knight.gold -= cost;
  }
  world.upgrades[side][category] = lvl + 1;
}

function tryUpgradeBase(side, type) {
  // type: 'base-repair' | 'base-hp' | 'base-armor'
  const map = { 'base-repair': 'baseRepair', 'base-hp': 'baseHP', 'base-armor': 'baseArmor' };
  const key = map[type];
  if (!key) return;
  const lvl = world.upgrades[side][key];
  const tree = CONFIG.upgrades[key];
  // Special: baseRepair is unlimited; use first tier as repeatable action
  if (key === 'baseRepair') {
    const u = tree[0];
    // Check missing before paying
    const missing = side === 'dragon'
      ? (world.dragonBaseMaxHP - world.dragonBaseHP)
      : (world.knightBaseMaxHP - world.knightBaseHP);
    if (missing <= 0) return; // already full, do nothing
    // Pay cost
    if (side === 'dragon') {
      if (world.resources.dragon.gems < u.cost) return;
      world.resources.dragon.gems -= u.cost;
      const heal = Math.min(u.amount, missing);
      world.dragonBaseHP += heal;
    } else {
      if (world.resources.knight.gold < u.cost) return;
      world.resources.knight.gold -= u.cost;
      const heal = Math.min(u.amount, missing);
      world.knightBaseHP += heal;
    }
    return; // do not advance level; repeatable
  }
  // Finite trees for baseHP / baseArmor
  if (lvl >= tree.length) return;
  const u = tree[lvl];
  // Pay cost
  if (side === 'dragon') {
    if (world.resources.dragon.gems < u.cost) return;
    world.resources.dragon.gems -= u.cost;
  } else {
    if (world.resources.knight.gold < u.cost) return;
    world.resources.knight.gold -= u.cost;
  }
  // Apply effect
  if (key === 'baseHP') {
    if (side === 'dragon') {
      world.dragonBaseMaxHP += u.bonus;
      world.dragonBaseHP += u.bonus; // also heal by bonus
    } else {
      world.knightBaseMaxHP += u.bonus;
      world.knightBaseHP += u.bonus;
    }
  } else if (key === 'baseArmor') {
    world.baseArmor[side] = Math.min(0.7, world.baseArmor[side] + u.add);
  }
  world.upgrades[side][key] = lvl + 1;
}

// Keyboard handling
window.addEventListener('keydown', (ev) => {
  const key = ev.key.toLowerCase();
  if (world.ended && key === 'enter') {
    doRestart();
    return;
  }
  // Upgrades first-keys
  if (key === 'q') return void tryUpgrade('dragon', 'attacker');
  if (key === 'a') return void tryUpgrade('dragon', 'worker');
  if (key === 'y') return void tryUpgrade('dragon', 'house');
  if (key === 'z') return void tryUpgrade('knight', 'attacker');
  if (key === 'h') return void tryUpgrade('knight', 'worker');
  if (key === 'b') return void tryUpgrade('knight', 'house');
  // Build: remaining keys per spec (without first key)
  if (key === 'w') return void tryBuild('dragon', 'attacker');
  if (key === 'e') return void tryBuild('dragon', 'thief');
  if (key === 'r') return void tryBuild('dragon', 'wizard');
  if (['s','d','f'].includes(key)) return void tryBuild('dragon', 'worker');
  if (['x','c'].includes(key)) return void tryBuild('dragon', 'house');
  if (key === 'u') return void tryBuild('knight', 'attacker');
  if (key === 'i') return void tryBuild('knight', 'thief');
  if (key === 'o') return void tryBuild('knight', 'archer');
  if (['j','k','l'].includes(key)) return void tryBuild('knight', 'worker');
  if (['n','m'].includes(key)) return void tryBuild('knight', 'house');
});

// Click on bases to open base-upgrade panel
canvas.addEventListener('click', (ev) => {
  const rect = canvas.getBoundingClientRect();
  const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
  const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
  const dLeft = Math.hypot(x - CONFIG.leftBaseX, y - CONFIG.laneY);
  const dRight = Math.hypot(x - CONFIG.rightBaseX, y - CONFIG.laneY);
  const margin = 14;
  if (dLeft <= CONFIG.baseRadius + margin) {
    openBasePanel('dragon');
  } else if (dRight <= CONFIG.baseRadius + margin) {
    openBasePanel('knight');
  }
});

restartBtn.addEventListener('click', () => doRestart());
document.addEventListener('DOMContentLoaded', applyI18n);

function doRestart() {
  world.reset();
  overlay.classList.add('hidden');
}

// Game loop
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt) {
  if (world.ended) return;
  // Update entities
  for (const e of world.entities) e.update(dt, world);
  // Cull dead
  world.entities = world.entities.filter(e => e.alive);
  // Floating texts
  updateFloaters(dt);
  // Projectiles
  updateProjectiles(dt);

  // Income per worker minus upkeep (tiered by worker count)
  const dWorkers = world.entities.filter(e => e.alive && e.type === 'worker' && e.side === 'dragon').length;
  const kWorkers = world.entities.filter(e => e.alive && e.type === 'worker' && e.side === 'knight').length;
  const dIncomeMult = world.upgrades.dragon.worker > 0 ? CONFIG.upgrades.worker[world.upgrades.dragon.worker - 1].incomeMult : 1;
  const kIncomeMult = world.upgrades.knight.worker > 0 ? CONFIG.upgrades.worker[world.upgrades.knight.worker - 1].incomeMult : 1;
  const dPerSec = workerIncomeBase(dWorkers) * dIncomeMult;
  const kPerSec = workerIncomeBase(kWorkers) * kIncomeMult;
  world.resources.dragon.gems += dPerSec * dt;
  world.resources.knight.gold += kPerSec * dt;

  // Win/Lose check
  if (world.dragonBaseHP <= 0 || world.knightBaseHP <= 0) {
    world.ended = true;
    const winnerKey = world.dragonBaseHP <= 0 ? 'app.knights' : 'app.dragons';
    const winner = t(winnerKey);
    message.textContent = t('overlay.win', { winner });
    overlay.classList.remove('hidden');
  }

  // HUD update
  HUD.dragonHP.textContent = Math.ceil(world.dragonBaseHP).toString();
  HUD.knightHP.textContent = Math.ceil(world.knightBaseHP).toString();
  HUD.dragonRes.textContent = String(Math.floor(world.resources.dragon.gems));
  HUD.knightRes.textContent = String(Math.floor(world.resources.knight.gold));
  HUD.dragonResRate.textContent = `(+${dPerSec.toFixed(1)}/s)`;
  HUD.knightResRate.textContent = `(+${kPerSec.toFixed(1)}/s)`;
  HUD.dragonHouses.textContent = String(world.houses.dragon);
  HUD.knightHouses.textContent = String(world.houses.knight);
  const dCap = world.capacity('dragon');
  const kCap = world.capacity('knight');
  const dAtk = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='attacker').length;
  const dThi = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='thief').length;
  const dRng = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='ranged').length;
  const dWor = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='worker').length;
  const kAtk = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='attacker').length;
  const kThi = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='thief').length;
  const kRng = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='ranged').length;
  const kWor = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='worker').length;
  HUD.dragonPopCap.textContent = `${dAtk + dThi + dRng + dWor}/${dCap}`;
  HUD.knightPopCap.textContent = `${kAtk + kThi + kRng + kWor}/${kCap}`;
  HUD.dragonAttackers.textContent = `${dAtk} ⚔️ / ${dThi} 🕵️ / ${dRng} ✨`;
  HUD.dragonWorkers.textContent = String(dWor);
  HUD.knightAttackers.textContent = `${kAtk} ⚔️ / ${kThi} 🕵️ / ${kRng} 🏹`;
  HUD.knightWorkers.textContent = String(kWor);

  // Upgrade HUD info
  const fmtCost = (side, amount) => side==='dragon' ? `💎 ${amount}` : `💰 ${amount}`;
  const roman = ['I','II','III','IV','V'];
  const upgName = (side, cat, lvlIdx) => {
    const rn = roman[lvlIdx] || String(lvlIdx+1);
    if (cat==='worker') return side==='knight' ? `Schaufeln ${rn}` : `Schatzsucher ${rn}`;
    if (cat==='attacker') return side==='dragon' ? `Schärfere Klauen ${rn}` : `Schärfere Schwerter ${rn}`;
    if (cat==='house') return `Doppelbetten ${rn}`;
    return '';
  };
  const nextText = (side, cat) => {
    const lvl = world.upgrades[side][cat];
    const tree = CONFIG.upgrades[cat];
    if (lvl >= tree.length) return t('status.maxed');
    const u = tree[lvl];
    const name = upgName(side, cat, lvl);
    if (cat==='worker') return `${name}: ${t('upgrades.workerEffect', { pct: Math.round((u.incomeMult-1)*100) })} · ${fmtCost(side, u.cost)}`;
    if (cat==='attacker') return `${name}: ${t('upgrades.attackerEffect', { pct: Math.round((u.dpsMult-1)*100) })} · ${fmtCost(side, u.cost)}`;
    if (cat==='house') return `${name}: ${t('upgrades.houseEffect', { slots: u.slotsBonus })} · ${fmtCost(side, u.cost)}`;
    return '';
  };
  HUD.dragonUpgAtk.textContent = nextText('dragon','attacker');
  HUD.dragonUpgWkr.textContent = nextText('dragon','worker');
  HUD.dragonUpgHse.textContent = nextText('dragon','house');
  HUD.knightUpgAtk.textContent = nextText('knight','attacker');
  HUD.knightUpgWkr.textContent = nextText('knight','worker');
  HUD.knightUpgHse.textContent = nextText('knight','house');

  // Base upgrades HUD
  const baseText = (side) => {
    const rep = CONFIG.upgrades.baseRepair[0]; // repeatable action
    const hpLvl = world.upgrades[side].baseHP;
    const armLvl = world.upgrades[side].baseArmor;
    const hpU = CONFIG.upgrades.baseHP[hpLvl];
    const arm = CONFIG.upgrades.baseArmor[armLvl];
    const resIcon = side==='dragon' ? '💎' : '💰';
    return {
      repair: `${t('upgrades.repair')}: +${rep.amount} HP · ${resIcon} ${rep.cost}`,
      hp: hpU ? `${t('upgrades.hp')}: +${hpU.bonus} Max-HP · ${resIcon} ${hpU.cost}` : t('status.maxed'),
      armor: arm ? `${t('upgrades.armor')}: +${Math.round(arm.add*100)}% weniger Basisschaden · ${resIcon} ${arm.cost}` : t('status.maxed'),
    };
  };
  const dBase = baseText('dragon');
  const kBase = baseText('knight');
  if (HUD.dragonUpgBaseRepair) HUD.dragonUpgBaseRepair.textContent = dBase.repair;
  if (HUD.dragonUpgBaseHP) HUD.dragonUpgBaseHP.textContent = dBase.hp;
  if (HUD.dragonUpgBaseArmor) HUD.dragonUpgBaseArmor.textContent = dBase.armor;
  if (HUD.knightUpgBaseRepair) HUD.knightUpgBaseRepair.textContent = kBase.repair;
  if (HUD.knightUpgBaseHP) HUD.knightUpgBaseHP.textContent = kBase.hp;
  if (HUD.knightUpgBaseArmor) HUD.knightUpgBaseArmor.textContent = kBase.armor;
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Lane
  ctx.strokeStyle = '#1f2547';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(0, CONFIG.laneY);
  ctx.lineTo(canvas.width, CONFIG.laneY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bases
  // Dragon cave (left)
  drawBase(CONFIG.leftBaseX, CONFIG.laneY, '#f472b6', world.dragonBaseHP, world.dragonBaseMaxHP);
  // Knight castle (right)
  drawBase(CONFIG.rightBaseX, CONFIG.laneY, '#4fd1c5', world.knightBaseHP, world.knightBaseMaxHP);
}

function drawBase(x, y, color, hp, maxHP) {
  ctx.save();
  // Base body
  ctx.fillStyle = color;
  const hpPct = clamp(hp / maxHP, 0, 1);
  ctx.globalAlpha = 0.15 + 0.45 * hpPct;
  ctx.beginPath();
  ctx.arc(x, y, CONFIG.baseRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  // HP ring
  ctx.beginPath();
  ctx.strokeStyle = '#ffffff22';
  ctx.lineWidth = 5;
  ctx.arc(x, y, CONFIG.baseRadius + 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.arc(x, y, CONFIG.baseRadius + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*hpPct);
  ctx.stroke();

  // Small house icons for capacity visual (left above, right above)
  const isLeft = x < canvas.width/2;
  const count = Math.min(20, Math.floor((hpPct*1000)%7)); // subtle sparkle not capacity
  // not drawing houses here; houses are in HUD for clarity

  // HP text when damaged
  if (hp < maxHP) {
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.ceil(hp)}/${Math.ceil(maxHP)}`, x, y - CONFIG.baseRadius - 12);
  }
  ctx.restore();
}

// (HUD shows houses via emoji; canvas row removed)

function draw() {
  drawBackground();
  // Entities
  for (const e of world.entities) e.draw(ctx);
  // Floating texts
  drawFloaters();
  // Projectiles
  drawProjectiles();
}

requestAnimationFrame(loop);

// Floating text utilities
function spawnFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, ttl: 0.9, vy: -22, alpha: 1 });
}

function updateFloaters(dt) {
  const arr = world.floaters;
  for (const f of arr) {
    f.ttl -= dt;
    f.y += f.vy * dt;
    f.alpha = Math.max(0, f.ttl / 0.9);
  }
  world.floaters = arr.filter(f => f.ttl > 0);
}

function drawFloaters() {
  ctx.save();
  ctx.font = 'bold 14px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0.1, f.alpha);
    // soft shadow for readability
    ctx.fillStyle = '#000000cc';
    ctx.fillText(f.text, Math.round(f.x)+1, Math.round(f.y)+1);
    ctx.fillText(f.text, Math.round(f.x)-1, Math.round(f.y)-1);
    ctx.globalAlpha = f.alpha;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, Math.round(f.x), Math.round(f.y));
  }
  ctx.restore();
}

// Projectiles for ranged units
function spawnProjectile(world, side, x, y, dir, damage, color) {
  world.projectiles.push({ side, x, y, dir, damage, color, speed: 240, radius: 3 });
}

function updateProjectiles(dt) {
  const arr = world.projectiles;
  for (const p of arr) {
    p.x += p.speed * dt * p.dir;
    // check unit hit
    for (const e of world.entities) {
      if (!e.alive) continue;
      if (e.side === p.side) continue;
      if (!(e.type === 'attacker' || e.type === 'thief' || e.type === 'ranged')) continue;
      if (Math.abs(e.x - p.x) <= (p.radius + 6) && Math.abs(e.y - p.y) < 14) {
        e.takeDamage(p.damage, { side: p.side, type: 'ranged' }, world);
        p.hit = true;
        break;
      }
    }
    if (p.hit) continue;
    // check base hit
    const baseX = p.side === 'dragon' ? CONFIG.rightBaseX : CONFIG.leftBaseX;
    const armor = p.side === 'dragon' ? (world.baseArmor.knight || 0) : (world.baseArmor.dragon || 0);
    if (Math.abs(p.x - baseX) <= CONFIG.baseRadius) {
      const dmg = p.damage * (1 - armor);
      if (p.side === 'dragon') world.knightBaseHP = Math.max(0, world.knightBaseHP - dmg);
      else world.dragonBaseHP = Math.max(0, world.dragonBaseHP - dmg);
      p.hit = true;
    }
  }
  world.projectiles = arr.filter(p => !p.hit && p.x > -20 && p.x < canvas.width + 20);
}

function drawProjectiles() {
  ctx.save();
  for (const p of world.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Click-to-upgrade for base upgrades (until keys are assigned)
document.addEventListener('click', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLElement)) return;
  if (!el.classList.contains('clickable')) return;
  const side = el.dataset.side; // 'dragon' | 'knight'
  const upg = el.dataset.upg; // 'base-repair' | 'base-hp' | 'base-armor'
  if (!side || !upg) return;
  tryUpgradeBase(side, upg);
});
