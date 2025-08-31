// Dragon Duel - minimal 2P RTS prototype

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const HUD = {
  dragonHP: document.getElementById('dragon-hp'),
  dragonRes: document.getElementById('dragon-res'),
  dragonHouses: document.getElementById('dragon-houses'),
  dragonPopCap: document.getElementById('dragon-popcap'),
  dragonAttackers: document.getElementById('dragon-attackers'),
  dragonWorkers: document.getElementById('dragon-workers'),
  knightHP: document.getElementById('knight-hp'),
  knightRes: document.getElementById('knight-res'),
  knightHouses: document.getElementById('knight-houses'),
  knightPopCap: document.getElementById('knight-popcap'),
  knightAttackers: document.getElementById('knight-attackers'),
  knightWorkers: document.getElementById('knight-workers'),
};

const overlay = document.getElementById('overlay');
const message = document.getElementById('message');
const restartBtn = document.getElementById('restart');

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
  worker: {
    hp: 25,
    size: 7,
    buildCooldown: 250,
  },
  housing: {
    slotsPerHouse: 5,
    initialSlots: 5,
    buildCooldown: 300,
  },
  houseIconSpacing: 9,
  income: {
    workerPerSec: 1,
  },
  costs: {
    // symmetric costs for first iteration
    dragon: { attacker: 4, worker: 6, house: 12 }, // Edelsteine
    knight: { attacker: 4, worker: 6, house: 12 }, // Gold
  }
};

// Utility
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// Upkeep scales within tier so small worker counts still produce.
// Example: 1..5 workers cost up to 1 total (linearly), 6..10 up to 2, then doubles per 5.
const workerUpkeep = (count) => {
  if (count <= 0) return 0;
  const tier = Math.ceil(count / 5); // 1..5 -> 1, 6..10 -> 2, etc.
  const tierMax = tier * 5;
  const tierCost = Math.pow(2, tier - 1); // 1,2,4,8,... (maximum at tier cap)
  const scale = count / tierMax; // linear within the tier
  return tierCost * scale;
};

class Entity {
  constructor({ side }) {
    this.side = side; // 'dragon' | 'knight'
    this.alive = true;
    this.hp = 1;
  }
  takeDamage(dmg) {
    this.hp -= dmg;
    if (this.hp <= 0) this.alive = false;
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
  }
  update(dt, world) {
    if (!this.alive) return;
    const dir = this.side === 'dragon' ? 1 : -1;

    // Acquire target: prioritize enemy attackers in range
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of world.entities) {
      if (!e.alive) continue;
      if (e.type !== 'attacker') continue;
      if (e.side === this.side) continue;
      const d = Math.abs(e.x - this.x);
      if (d < nearestDist) { nearest = e; nearestDist = d; }
    }

    const baseX = this.side === 'dragon' ? CONFIG.rightBaseX : CONFIG.leftBaseX;
    const inRangeOfEnemy = nearest && Math.abs(nearest.x - this.x) <= CONFIG.attacker.range + this.size;

    if (inRangeOfEnemy) {
      // Attack enemy attacker
      nearest.takeDamage(CONFIG.attacker.dps * dt);
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
      if (this.side === 'dragon') world.knightBaseHP = Math.max(0, world.knightBaseHP - CONFIG.attacker.dps * dt);
      else world.dragonBaseHP = Math.max(0, world.dragonBaseHP - CONFIG.attacker.dps * dt);
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

class World {
  constructor() {
    this.entities = [];
    this.dragonBaseHP = CONFIG.baseHP;
    this.knightBaseHP = CONFIG.baseHP;
    this.houses = { dragon: 0, knight: 0 };
    this.resources = { dragon: { gems: 0 }, knight: { gold: 0 } };
    this.cooldowns = {
      dragon: { attacker: 0, worker: 0, house: 0 },
      knight: { attacker: 0, worker: 0, house: 0 },
    };
    this.ended = false;
  }
  reset() {
    this.entities = [];
    this.dragonBaseHP = CONFIG.baseHP;
    this.knightBaseHP = CONFIG.baseHP;
    this.houses = { dragon: 0, knight: 0 };
    this.resources = { dragon: { gems: 0 }, knight: { gold: 0 } };
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
    return CONFIG.housing.initialSlots + this.houses[side] * CONFIG.housing.slotsPerHouse;
  }
  population(side) {
    return this.entities.filter(e => e.alive && e.side === side && (e.type === 'attacker' || e.type === 'worker')).length;
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
  if (!nowCooldowns._ts) nowCooldowns._ts = { attacker: 0, worker: 0, house: 0 };
  const ts = nowCooldowns._ts;
  const cdMap = { attacker: CONFIG.attacker.buildCooldown, worker: CONFIG.worker.buildCooldown, house: CONFIG.housing.buildCooldown };
  if (now < ts[kind]) return;

  // Resource check and deduction
  const sideCosts = CONFIG.costs[side];
  const cost = sideCosts[kind] ?? 0;
  const have = side === 'dragon' ? world.resources.dragon.gems : world.resources.knight.gold;
  if (have < cost) return; // not enough resources

  if (kind === 'house') {
    world.houses[side] += 1;
    if (side === 'dragon') world.resources.dragon.gems -= cost;
    else world.resources.knight.gold -= cost;
    ts.house = now + cdMap.house;
    return;
  }

  if (!world.canAddUnit(side)) return;

  if (kind === 'attacker') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Attacker(side));
  } else if (kind === 'worker') {
    if (side === 'dragon') world.resources.dragon.gems -= cost; else world.resources.knight.gold -= cost;
    world.entities.push(new Worker(side));
  }
  ts[kind] = now + cdMap[kind];
}

// Keyboard handling
window.addEventListener('keydown', (ev) => {
  const key = ev.key.toLowerCase();
  if (world.ended && key === 'enter') {
    doRestart();
    return;
  }
  // Dragons on left clusters
  if (dragonKeys.attacker.has(key)) return void tryBuild('dragon', 'attacker');
  if (dragonKeys.worker.has(key)) return void tryBuild('dragon', 'worker');
  if (dragonKeys.house.has(key)) return void tryBuild('dragon', 'house');
  // Knights on right clusters
  if (knightKeys.attacker.has(key)) return void tryBuild('knight', 'attacker');
  if (knightKeys.worker.has(key)) return void tryBuild('knight', 'worker');
  if (knightKeys.house.has(key)) return void tryBuild('knight', 'house');
});

restartBtn.addEventListener('click', () => doRestart());

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

  // Income per worker minus upkeep (tiered by worker count)
  const dWorkers = world.entities.filter(e => e.alive && e.type === 'worker' && e.side === 'dragon').length;
  const kWorkers = world.entities.filter(e => e.alive && e.type === 'worker' && e.side === 'knight').length;
  const dNet = dWorkers * CONFIG.income.workerPerSec - workerUpkeep(dWorkers);
  const kNet = kWorkers * CONFIG.income.workerPerSec - workerUpkeep(kWorkers);
  world.resources.dragon.gems = Math.max(0, world.resources.dragon.gems + dNet * dt);
  world.resources.knight.gold = Math.max(0, world.resources.knight.gold + kNet * dt);

  // Win/Lose check
  if (world.dragonBaseHP <= 0 || world.knightBaseHP <= 0) {
    world.ended = true;
    const winner = world.dragonBaseHP <= 0 ? 'Ritter' : 'Drachen';
    message.textContent = `${winner} gewinnen! [Enter] für Neustart`;
    overlay.classList.remove('hidden');
  }

  // HUD update
  HUD.dragonHP.textContent = Math.ceil(world.dragonBaseHP).toString();
  HUD.knightHP.textContent = Math.ceil(world.knightBaseHP).toString();
  HUD.dragonRes.textContent = String(Math.floor(world.resources.dragon.gems));
  HUD.knightRes.textContent = String(Math.floor(world.resources.knight.gold));
  HUD.dragonHouses.textContent = String(world.houses.dragon);
  HUD.knightHouses.textContent = String(world.houses.knight);
  const dCap = world.capacity('dragon');
  const kCap = world.capacity('knight');
  const dAtk = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='attacker').length;
  const dWor = world.entities.filter(e => e.alive && e.side==='dragon' && e.type==='worker').length;
  const kAtk = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='attacker').length;
  const kWor = world.entities.filter(e => e.alive && e.side==='knight' && e.type==='worker').length;
  HUD.dragonPopCap.textContent = `${dAtk + dWor}/${dCap}`;
  HUD.knightPopCap.textContent = `${kAtk + kWor}/${kCap}`;
  HUD.dragonAttackers.textContent = String(dAtk);
  HUD.dragonWorkers.textContent = String(dWor);
  HUD.knightAttackers.textContent = String(kAtk);
  HUD.knightWorkers.textContent = String(kWor);
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
  drawBase(CONFIG.leftBaseX, CONFIG.laneY, '#f472b6', world.dragonBaseHP / CONFIG.baseHP);
  // Knight castle (right)
  drawBase(CONFIG.rightBaseX, CONFIG.laneY, '#4fd1c5', world.knightBaseHP / CONFIG.baseHP);
}

function drawBase(x, y, color, hpPct) {
  ctx.save();
  // Base body
  ctx.fillStyle = color;
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
  ctx.arc(x, y, CONFIG.baseRadius + 8, -Math.PI/2, -Math.PI/2 + Math.PI*2*clamp(hpPct,0,1));
  ctx.stroke();

  // Small house icons for capacity visual (left above, right above)
  const isLeft = x < canvas.width/2;
  const count = Math.min(20, Math.floor((hpPct*1000)%7)); // subtle sparkle not capacity
  // not drawing houses here; houses are in HUD for clarity
  ctx.restore();
}

// (HUD shows houses via emoji; canvas row removed)

function draw() {
  drawBackground();
  // Entities
  for (const e of world.entities) e.draw(ctx);
}

requestAnimationFrame(loop);
