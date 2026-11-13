/* 碳途纪元 · 2D 网页版（D-60）
 * 从 godot/scripts/main2d.gd + space2d.gd 移植：同一套投影/判定/节奏常量。
 * 纯 Canvas2D，无依赖、无构建，双击 index.html 即可玩。
 */
(() => {
"use strict";

// ───────────────────────── 常量（照抄 space2d.gd / main2d.gd）─────────────────────────
const W = 720, H = 1440;
const R_CYL = 1000, LANE_W = 3.2, H_CAM = 6.8, B_CAM = 14;
const F_PX = 780, Y_HORIZON = 576, CX = 360;
const EDGE_PAD = 48;

const SPEED_BASE = 25, SPEED_MAX = 35, SPEED_STEP = 1.5, SPEED_PER = 3;
const BOND_AHEAD = 3.0, BOND_BEHIND = 2.0, BOND_BUFFER = 0.20;
const ATOM_CLEARANCE = 7.0, WALL_SPAN = 20.0, DRAW_AHEAD = 150.0;
const RAMP_DIST = 240.0;
const COLLAPSE_LEN = 1.55, SKIP_AFTER = 0.6;
const TRAIL_H = [1.85, 2.63, 3.41];

const COL_H = "#ff735e", COL_O = "#8bec62", COL_CYAN = "#78efff", COL_WALL = "#4fc3d9";
const PLAYER_BODY = "#2b3138", PLAYER_RIM = "#cfe9f2", PLAYER_INNER = "#9fc4cf";

const MODULE_LABEL = {
  "atom_H": "H", "atom_O": "O", "atom_C": "C",
  "group_CH3": "CH₃", "group_NH2": "NH₂", "group_OH": "OH", "group_CH2": "CH₂",
  "group_CN": "CN", "group_COOH": "COOH",
  "module_sugar": "糖", "module_phosphate": "磷", "base_A": "A",
  "aa_Ser": "Ser", "aa_His": "His", "aa_Asp": "Asp", "scaffold": "架",
  "nuc_A": "A", "nuc_U": "U", "nuc_G": "G", "nuc_C": "C",
  "bp_AT": "AT", "bp_GC": "GC",
};
const MODULE_COLOR = {
  "atom_H": "#ff735e", "atom_O": "#8bec62", "atom_C": "#9fb6c4",
  "group_CH3": "#ff9a7a", "group_NH2": "#8ea8ff", "group_OH": "#ffd479", "group_CH2": "#ffb08a",
  "group_CN": "#a0c8ff", "group_COOH": "#ffcf9a",
  "module_sugar": "#b7a6ff", "module_phosphate": "#7fd8ff", "base_A": "#ffb3c7",
  "aa_Ser": "#9fe6c3", "aa_His": "#7fc8ff", "aa_Asp": "#ffb07f", "scaffold": "#c9d6e0",
  "nuc_A": "#ffb3c7", "nuc_U": "#b7a6ff", "nuc_G": "#ffd479", "nuc_C": "#7fd8ff",
  "bp_AT": "#ff9a7a", "bp_GC": "#7fd8ff",
};
const ELEMENT_COLOR = { H: "#ff735e", C: "#9aa6ad", N: "#8ca8ff", O: "#8bec62", P: "#e0b45a", S: "#dbdb66" };

// 每关的视觉主题（对应 level_visual.gd 的 ENV 表，取主色即可）
const ENV = {
  primordial_ocean:      { top: "#04070d", hor: "#0a2a33", groundNear: "#020d14", groundFar: "#08303a", lane: "#78efff", edge: "#47d8e8", accent: "#a9f8ff" },
  primordial_atmosphere: { top: "#06090f", hor: "#123038", groundNear: "#041014", groundFar: "#0c2c34", lane: "#78efff", edge: "#3ab0c0", accent: "#8defff" },
  hydrothermal:          { top: "#07070a", hor: "#2a1e0c", groundNear: "#080604", groundFar: "#2a1c0c", lane: "#ffd479", edge: "#c9973f", accent: "#ffe0a0" },
  enzyme_network:        { top: "#0e0a06", hor: "#2a1f10", groundNear: "#0a0703", groundFar: "#241a0c", lane: "#ffd479", edge: "#e0b45a", accent: "#ffe6a8" },
  deep_vent:             { top: "#0a0816", hor: "#231b3a", groundNear: "#07050f", groundFar: "#1c1630", lane: "#b7a6ff", edge: "#7a6cf0", accent: "#d7cdff" },
  rna_mouth:             { top: "#0a0816", hor: "#1e2440", groundNear: "#07060f", groundFar: "#171d33", lane: "#a0c8ff", edge: "#5f7be0", accent: "#cfe0ff" },
  rna:                   { top: "#08101a", hor: "#123040", groundNear: "#050b12", groundFar: "#10263a", lane: "#7fd8ff", edge: "#3f9fd0", accent: "#c8f0ff" },
  dna:                   { top: "#0a0f14", hor: "#14303a", groundNear: "#060a0e", groundFar: "#0f2530", lane: "#9fe6c3", edge: "#41b48a", accent: "#d6ffe9" },
};

// 赛道两侧装饰外形（与 Godot 版一一对应，D-64）
const SIDE_SHAPES = {
  1: "disc", 2: "rain", 3: "tetra", 4: "pyramid",
  5: "droplet", 6: "hex", 7: "triple", 8: "carbonyl",
  9: "beads", 10: "nucleotide", 11: "ribbon",
  12: "hairpin", 13: "helix",
};
const sideShapeOf = (id) => SIDE_SHAPES[id] || "disc";

// 分子越大 → 路外景越大；场景越"稠/深" → 漂得越慢，大的更慢（÷√尺寸）（D-65）
const SIDE_SCALE = {
  1: 0.90, 2: 0.90, 3: 1.02, 4: 0.96, 5: 1.08, 6: 1.08, 7: 0.90,
  8: 0.96, 9: 1.24, 10: 1.32, 11: 1.36, 12: 1.38, 13: 1.42,
};
const SIDE_SPEED = {
  1: 1.15, 2: 1.30, 3: 0.85, 4: 0.95, 5: 0.78, 6: 1.05, 7: 1.00,
  8: 0.92, 9: 1.05, 10: 0.95, 11: 0.88, 12: 0.95, 13: 0.90,
};
const sideScaleOf = (id) => SIDE_SCALE[id] ?? 1.0;
const sideSpeedOf = (id) => SIDE_SPEED[id] ?? 1.0;

// ───────────────────────── 投影（space2d.gd）─────────────────────────
const horizonArc = () => Math.sqrt((R_CYL + H_CAM) * (R_CYL + H_CAM) - R_CYL * R_CYL);
function project(s, x = 0, h = 0) {
  const sc = B_CAM + s;
  const sag = (sc * sc) / (2 * R_CYL);
  const yc = H_CAM + sag - h;
  return { x: CX + (F_PX * x) / sc, y: Y_HORIZON + (F_PX * yc) / sc };
}
const scaleAt = (s) => F_PX / (B_CAM + s);
function horizonY() {
  const sh = horizonArc(), sc = B_CAM + sh, sag = (sc * sc) / (2 * R_CYL);
  return Y_HORIZON + (F_PX * (H_CAM + sag)) / sc;
}
const laneX = (lane) => (lane - 1) * LANE_W;

// ───────────────────────── 画布与缩放（aspect keep，黑边）─────────────────────────
const cv = document.getElementById("cv");
const ctx = cv.getContext("2d");
let dpr = Math.min(window.devicePixelRatio || 1, 2);
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  const vw = window.innerWidth, vh = window.innerHeight;
  const scale = Math.min(vw / W, vh / H);          // keep：等比缩放 + 黑边
  const cw = Math.floor(W * scale), ch = Math.floor(H * scale);
  cv.style.width = cw + "px";
  cv.style.height = ch + "px";
  cv.width = Math.floor(W * dpr);
  cv.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewScale = scale;
}
let viewScale = 1;
window.addEventListener("resize", resize);

// ───────────────────────── 工具 ─────────────────────────
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const TAU = Math.PI * 2;
function hash01(v) { return Math.abs(Math.sin(v * 12.9898 + 78.233) * 43758.5453) % 1; }
function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
  const g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
  const bl = Math.round(lerp(a & 255, b & 255, t));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
const FONT = (size, bold) => `${bold ? "700 " : ""}${size}px "Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif`;

// ───────────────────────── 音频辅助（audio.js 提供合成；未加载则全部静默）─────────────────────────
const audio = () => window.GameAudio || null;
function play(name, ...args) {
  const a = audio();
  if (!a || !a.ready) return;
  try { if (a[name]) a[name](...args); } catch (e) {}
}
let bgmStarted = false;
function unlockAudio() {
  const a = audio();
  if (!a) return;
  try {
    a.init();
    if (MUTED) a.setMuted(true);
    // 第一次交互就把 BGM 铺上（菜单里也有），不必等到进关卡
    if (!bgmStarted) { bgmStarted = true; a.startMusic(); }
  } catch (e) {}
}

// ───────────────────────── 游戏状态 ─────────────────────────
const SAVE_KEY = "carbon_era_2d_web_v1";
let save = { unlocked: 1, best: {}, muted: false, helpShown: false };
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const d = JSON.parse(raw);
    save = Object.assign(save, d);
    save.helpShown = !!d.helpShown;
  }
} catch (e) {}
let MUTED = !!save.muted;
function setMuted(m) {
  MUTED = !!m;
  save.muted = MUTED;
  writeSave();
  const a = audio();
  if (a && a.ready) { try { a.setMuted(MUTED); } catch (e) {} }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

const G = {
  mode: "menu",            // menu | intro | countdown | play | collapse | lose
  level: LEVELS[0],
  levelIndex: 0,
  dist: 0, runTime: 0, lane: 1, laneXv: 0, laneVel: 0,
  speed: SPEED_BASE, deliveries: 0, cleared: false, clearTime: -1, hits: 0,
  collected: [], entities: [],
  nextAtom: 0, nextWall: 0, nextGate: 0, atomIndex: 0,
  bondBuffer: 0, collapseT: 0, countdownT: 0,
  shake: 0, flash: 0, camKick: 0, camPan: 0,
  playerHidden: false, foldT: 0, foldActive: false,
  trailT: 0, fxT: 0,
  menuSel: 0, introHover: false, introBtn: { x: 214, y: 1138, w: 292, h: 94 },
  bigText: "", bigTextColor: COL_CYAN, bigTextA: 0,
  helpPage: 0,
  bondDip: -1, frictionT: 0,
  sparks: [], dust: [], waves: [], shards: [], residue: [], rings: [],
  loose: [],               // 主菜单飘浮圆片用不到，保留占位
};

const env = () => ENV[G.level.environment] || ENV.primordial_ocean;
const levelGoal = () => Math.max(1, (G.level.goal | 0) || 1);

function resetRun() {
  G.dist = 0; G.runTime = 0; G.lane = 1; G.laneXv = 0; G.laneVel = 0;
  G.speed = SPEED_BASE; G.deliveries = 0; G.cleared = false; G.clearTime = -1; G.hits = 0;
  G.collected = []; G.entities = [];
  G.nextAtom = 12; G.nextWall = 46; G.nextGate = 82; G.atomIndex = 0;
  G.bondBuffer = 0; G.collapseT = 0; G.countdownT = 0;
  G.shake = 0; G.flash = 0; G.camKick = 0; G.camPan = 0;
  G.playerHidden = false; G.foldT = 0; G.foldActive = false;
  G.trailT = 0; G.fxT = 0;
  G.sparks = []; G.dust = []; G.waves = []; G.shards = []; G.residue = []; G.rings = [];
  G.bigTextA = 0;
  spawnAhead();
}

// ───────────────────────── 生成（含 D-59 难度爬坡）─────────────────────────
function speedScale() { return G.speed / SPEED_BASE; }
function difficulty() { return clamp(G.dist / RAMP_DIST, 0, 1); }

function safeLaneNear(s, preferred, clearance = 18) {
  for (const cand of [preferred, 0, 1, 2]) {
    let blocked = false;
    for (const e of G.entities) {
      if ((e.kind === "wall" || e.kind === "gate") && e.lane === cand && Math.abs(e.s - s) < clearance) { blocked = true; break; }
    }
    if (!blocked) return cand;
  }
  return preferred;
}
function wallBlockedNear(s, span) {
  for (const e of G.entities) if (e.kind === "wall" && Math.abs(e.s - s) < span) return true;
  return false;
}
function spawnAhead() {
  const k = speedScale(), d = difficulty();
  const atomLo = lerp(9.5, 15.0, d), atomHi = lerp(4.5, 6.5, d);
  const wallLo = lerp(44.0, 26.0, d), wallHi = lerp(14.0, 8.0, d);
  while (G.nextAtom < G.dist + DRAW_AHEAD) {
    const type = G.level.modules[G.atomIndex % G.level.modules.length];
    const lane = safeLaneNear(G.nextAtom, Math.floor(Math.random() * 3), ATOM_CLEARANCE);
    G.entities.push({ kind: "atom", type, s: G.nextAtom, lane, hit: false });
    G.atomIndex++;
    G.nextAtom += (atomLo + Math.random() * atomHi) * k;
  }
  while (G.nextWall < G.dist + DRAW_AHEAD) {
    if (wallBlockedNear(G.nextWall, WALL_SPAN)) { G.nextWall += 4; continue; }
    const lane = safeLaneNear(G.nextWall, Math.floor(Math.random() * 3));
    G.entities.push({ kind: "wall", s: G.nextWall, lane, hit: false });
    G.nextWall += (wallLo + Math.random() * wallHi) * k;
  }
  while (G.nextGate < G.dist + DRAW_AHEAD) {
    const lane = safeLaneNear(G.nextGate, Math.floor(Math.random() * 3));
    G.entities.push({ kind: "gate", s: G.nextGate, lane, hit: false });
    G.nextGate += 82 * k;
  }
}
function cull() { G.entities = G.entities.filter((e) => e.s - G.dist >= -3); }

// ───────────────────────── 判定 ─────────────────────────
function typeNeeded(type) {
  const need = G.level.modules.filter((m) => m === type).length;
  const have = G.collected.filter((m) => m === type).length;
  return have < need;
}
function targetComplete() {
  if (G.collected.length !== G.level.modules.length) return false;
  const need = [...G.level.modules].sort().join("|");
  const have = [...G.collected].sort().join("|");
  return need === have;
}
function remainingAtoms() { return Math.max(0, G.level.modules.length - G.collected.length); }

function currentSpeed() {
  const steps = Math.floor(G.deliveries / SPEED_PER);
  return Math.min(SPEED_MAX, SPEED_BASE + steps * SPEED_STEP);
}

function moveLane(dir) {
  if (G.mode !== "play") return;
  const next = clamp(G.lane + dir, 0, 2);
  if (next === G.lane) return;
  G.lane = next;
  G.laneVel = dir * 6.0;
}
// 下滑压扁曲线（照搬 Godot 的 _dip_curve）：先快速压扁，再回弹过冲一点
function dipCurve(tt) {
  const tDown = 0.07, tUp = 0.27, depth = 0.42;
  if (tt < tDown) {
    const k1 = tt / tDown;
    const sy1 = 1 - depth * k1 * k1;
    return { x: Math.pow(sy1, -0.5), y: sy1 };
  }
  const k2 = clamp((tt - tDown) / tUp, 0, 1);
  const easeOut = 1 - Math.pow(1 - k2, 3);
  const wobble = Math.sin(k2 * Math.PI) * 0.055;
  const sy2 = lerp(1 - depth, 1 + wobble, easeOut);
  return { x: Math.pow(sy2, -0.5), y: sy2 };
}

function requestBond() {
  if (G.mode !== "play") return;
  G.bondBuffer = BOND_BUFFER;
  // 主角压扁再回弹（D-35）
  G.bondDip = 0;
  G.frictionT = 0.20;
  const ball = project(0, laneX(G.lane), 0.59);
  addWave(ball, 0.55, 110, 0.22, COL_CYAN);
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * TAU, sp = 90 * (0.4 + Math.random());
    G.sparks.push({ p: { x: ball.x, y: ball.y + 26 }, v: { x: Math.cos(a) * sp, y: Math.sin(a) * sp },
      t: 0, life: 0.26 + Math.random() * 0.2, color: COL_CYAN, size: 1.4 + Math.random() * 1.4, drag: 3.0 });
  }
  // 地面摩擦：白色火花从球前后方甩出（窄扇形，朝屏幕下方）
  const g = project(0, laneX(G.lane), 0.10);
  const n = Math.round(14 + 6 * 1.0);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * 0.5 + (Math.random() - 0.5) * 1.0;
    const sp = 180 + Math.random() * 190;
    G.dust.push({ p: { x: g.x + (Math.random() - 0.5) * 34, y: g.y - 8 + Math.random() * 8 },
      v: { x: Math.cos(a) * sp, y: Math.sin(a) * sp }, t: 0, life: 0.34 + Math.random() * 0.32,
      color: "#ffffff", size: 1.4 + Math.random() * 1.9, drag: 2.0, a0: 1 });
  }
}

// ─── 门的脉冲：成键轻 / 撞门重，放大再缩回，内→外逐圈变亮（D-66）───
const GATE_PULSE_LEN = 0.46;
function gatePulseOf(e) {
  const u = clamp((G.fxT - (e.pulseAt ?? -999)) / GATE_PULSE_LEN, 0, 1);
  if (u >= 1) return 0;
  return (e.pulseAmp ?? 0) * Math.sin(Math.PI * u);
}
function checkInteractions() {
  const reach = currentSpeed() / SPEED_BASE;
  for (const e of G.entities) {
    if (e.hit) continue;
    const rel = e.s - G.dist;
    if (rel < -BOND_BEHIND * reach || rel > BOND_AHEAD * reach || e.lane !== G.lane) continue;
    if (e.kind === "atom") {
      if (G.bondBuffer > 0 && !targetComplete() && typeNeeded(e.type)) absorbAtom(e);
      else if (targetComplete() && G.bondBuffer <= 0) kickAtom(e);
      else if (rel < 0.9 * reach) shatterAtom(e);
    } else if (e.kind === "wall") {
      e.hit = true;
      hitWall();
      return;
    } else if (e.kind === "gate") {
      e.hit = true;
      if (targetComplete()) deliver(e);
      else { beginCollapse("分子不符"); return; }
    }
  }
}

function absorbAtom(e) {
  e.hit = true;

  const slot = G.collected.length;
  G.collected.push(e.type);
  G.bondBuffer = 0;
  const p = project(e.s - G.dist, laneX(e.lane), 0.9);
  burst(p, MODULE_COLOR[e.type] || COL_CYAN, 14, 180);
  addWave(p, 0.85, 150, 0.45, COL_CYAN);
  G.shake = Math.max(G.shake, 2.5);
  play("bond", G.collected.length - 1);
  bigText(`${MODULE_LABEL[e.type] || e.type} 成键`, MODULE_COLOR[e.type] || COL_CYAN, 0.9);
  if (targetComplete()) {
    play("full");
    bigText(`${G.level.formula} 已成键 · 找门`, COL_CYAN, 1.4);
  }
}

function kickAtom(e) {
  e.hit = true;
  const p = project(e.s - G.dist, laneX(e.lane), 0.9);
  burst(p, MODULE_COLOR[e.type] || COL_CYAN, 10, 220);
  shatter(p, MODULE_COLOR[e.type] || COL_CYAN, 0.85, { x: 0, y: -1 });
}
function shatterAtom(e) {
  e.hit = true;
  const p = project(e.s - G.dist, laneX(e.lane), 0.9);
  const power = 0.55 + 0.45 * (currentSpeed() / SPEED_BASE);
  shatter(p, MODULE_COLOR[e.type] || COL_CYAN, power, { x: 0, y: -1 });
  play("shatter");
  addResidue(e.s, laneX(e.lane), 1.0);
  G.shake = Math.max(G.shake, 2.2 * power);
}

function deliver(e) {
  if (e) { e.pulseAt = G.fxT; e.pulseAmp = 0.45; }

  G.deliveries++;
  G.collected = [];
  G.bondBuffer = 0;
  G.shake = Math.max(G.shake, 7);
  G.flash = Math.max(G.flash, 0.28);
  const p = project(0, laneX(G.lane), 0.75);
  addWave(p, 1.05, 190, 0.5, COL_CYAN);
  burst(p, COL_CYAN, 14, 200);
  play("deliver");
  {
    const a = audio();
    if (a && a.ready) a.setTier(Math.min(2, Math.floor(G.deliveries / 2)));
  }
  bigText(`${G.level.formula} 交付`, COL_CYAN, 1.5);
  if (!G.cleared && G.deliveries >= levelGoal()) {
    G.cleared = true;
    G.clearTime = G.runTime;
    const best = save.best[G.level.id] || 0;
    if (G.deliveries > best) save.best[G.level.id] = G.deliveries;
    save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.level.id + 1));
    writeSave();
    play("clear");
    bigText("✓ 关卡完成 · 已解锁下一关", "#cfe9f2", 2.2);
  }
}

function hitWall() {
  G.hits++;
  beginCollapse("撞上结构墙");
}

function beginCollapse(reason) {
  if (G.mode === "collapse" || G.mode === "lose") return;
  G.mode = "collapse";
  G.collapseT = 0;
  G.playerHidden = true;
  play("impact", reason.indexOf("墙") >= 0 ? "wall" : "gate");
  G.flash = Math.max(G.flash, 0.72);
  G.shake = 18;
  const p = project(0, laneX(G.lane), 0.59);
  burst(p, "#ffffff", 40, 420);
  addWave(p, 1.8, 420, 0.7, "#ffffff");
  shatter(p, PLAYER_RIM, 1.5, { x: 0, y: -1 });
  bigText(reason, "#ffd0c8", 1.6);
}

function finishLose() {
  G.mode = "lose";
  if (G.cleared) save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length, G.level.id + 1));
  writeSave();
}

// ───────────────────────── 特效 ─────────────────────────
function bigText(text, color, hold) {
  G.bigText = text; G.bigTextColor = color; G.bigTextA = 1; G.bigTextHold = hold || 1.0;
}
function burst(p, color, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = sp * (0.35 + Math.random() * 0.9);
    G.sparks.push({ p: { x: p.x, y: p.y }, v: { x: Math.cos(a) * s, y: Math.sin(a) * s },
      t: 0, life: 0.3 + Math.random() * 0.4, color, size: 1.2 + Math.random() * 1.8, drag: 3.4 });
  }
}
function shatter(p, color, power, dir) {
  const n = Math.round(5 + 4 * power);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const spread = { x: Math.cos(a), y: Math.sin(a) * 0.85 };
    const push = 120 * power;
    const roll = Math.random();
    let size = roll < 0.18 ? 7 + Math.random() * 6 : roll < 0.55 ? 3.2 + Math.random() * 3 : 1 + Math.random() * 1.8;
    size *= 0.8 + power * 0.45;
    G.shards.push({
      p: { x: p.x + spread.x * 6, y: p.y + spread.y * 6 },
      v: { x: dir.x * push * (0.55 + Math.random() * 0.7) + spread.x * push * (0.35 + Math.random() * 0.65),
           y: dir.y * push * (0.55 + Math.random() * 0.7) + spread.y * push * (0.35 + Math.random() * 0.65) },
      rot: Math.random() * TAU, rv: (Math.random() - 0.5) * 14, size,
      color, t: 0, life: 0.5 + Math.random() * 0.45,
    });
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * TAU, s = 90 * power * (0.3 + Math.random());
    G.dust.push({ p: { x: p.x, y: p.y }, v: { x: Math.cos(a) * s, y: Math.sin(a) * s },
      t: 0, life: 0.35 + Math.random() * 0.35, color, size: 1 + Math.random() * 2, drag: 3.2, a0: 0.9 });
  }
}
function addWave(p, power, r1, life, color) {
  G.waves.push({ p: { x: p.x, y: p.y }, t: 0, life, power, r0: 12, r1, color });
}
function addResidue(s, x, strength) {
  const p = project(s, x, 0.02);
  G.residue.push({ p: { x: p.x, y: p.y }, t: 0, life: 3 + Math.random() * 2, size: 4 + Math.random() * 7 * strength });
}

function stepFx(dt) {
  const upd = (arr, grav) => {
    for (const o of arr) {
      o.t += dt;
      const drag = o.drag ?? 0;
      if (drag > 0) { const f = Math.exp(-drag * dt); o.v.x *= f; o.v.y *= f; }
      o.p.x += o.v.x * dt;
      o.p.y += (o.v.y + (grav || 0)) * dt;
      if (o.rot !== undefined) o.rot += (o.rv || 0) * dt;
    }
    return arr.filter((o) => o.t < o.life);
  };
  G.sparks = upd(G.sparks, 220);
  G.dust = upd(G.dust, 60);
  G.shards = upd(G.shards, 420);
  G.waves = G.waves.filter((w) => (w.t += dt) < w.life);
  G.residue = G.residue.filter((r) => (r.t += dt) < r.life);
  G.bigTextA = Math.max(0, G.bigTextA - dt * 1.15);
}

// ───────────────────────── 主循环 ─────────────────────────
let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

const IS_SELFTEST = new URLSearchParams(location.search).get("selftest") === "1";

function update(dt) {
  if (G.mode === "pause" || G.mode === "help") return;

  G.fxT += dt;
  stepFx(dt);
  G.shake *= Math.exp(-9 * dt);
  G.flash = Math.max(0, G.flash - dt * 4.2);
  G.camKick += (0 - G.camKick) * (1 - Math.exp(-dt * 6));
  G.camPan = laneX(G.lane) * 0.15;
  if (G.foldActive) { G.foldT += dt; if (G.foldT > 1.8) G.foldActive = false; }

  if (G.mode === "play") {
    G.bondBuffer = Math.max(0, G.bondBuffer - dt);
    if (G.bondDip >= 0) { G.bondDip += dt; if (G.bondDip > 0.35) G.bondDip = -1; }
    G.frictionT = Math.max(0, G.frictionT - dt);
    G.runTime += dt;
    G.dist += currentSpeed() * dt;
    G.laneXv += (laneX(G.lane) - G.laneXv) * (1 - Math.exp(-dt * 14));
    if (Math.abs(G.laneVel) > 0.001) { G.laneXv += G.laneVel * dt; G.laneVel *= Math.exp(-dt * 12); }
    spawnAhead();
    checkInteractions();
    cull();
    // 拖尾
    G.trailT -= dt;
    while (G.trailT <= 0) {
      G.trailT += 0.075;
      const pr = 0.6 * scaleAt(0);
      const p = project(0, G.laneXv, 0.42);
      G.dust.push({ p: { x: p.x + (Math.random() - 0.5) * 16, y: p.y + 5 + Math.random() * 6 },
        v: { x: (Math.random() - 0.5) * 16 - G.laneVel * 40, y: 26 + Math.random() * 22 },
        t: 0, life: 0.62 + Math.random() * 0.42, color: "#76ccdf",
        size: pr * (0.29 + Math.random() * 0.09), shrink: true, a0: 0.5, drag: 2.4 });
    }
  } else if (G.mode === "countdown") {
    const d0 = Math.max(1, Math.ceil(Math.max(G.countdownT, 0)));
    G.countdownT -= dt;
    const d1 = Math.max(1, Math.ceil(Math.max(G.countdownT, 0)));
    if (d1 !== d0) play("tick", d1);
    if (G.countdownT <= 0) { G.countdownT = 0; G.mode = "play"; }
  } else if (G.mode === "collapse") {
    G.collapseT += dt;
    if (G.collapseT >= COLLAPSE_LEN) finishLose();
  } else if (G.mode === "menu") {
    G.dist += dt * 1.4;
  }
}

// ───────────────────────── 绘制 ─────────────────────────
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (G.mode === "menu") { drawMenu(); drawFlash(); return; }

  const sx = G.shake > 0.01 ? (Math.random() - 0.5) * 26 * Math.pow(clamp(G.shake / 18, 0, 1), 2) : 0;
  const sy = G.shake > 0.01 ? (Math.random() - 0.5) * 26 * Math.pow(clamp(G.shake / 18, 0, 1), 2) : 0;
  const dx = -(G.camPan) * (F_PX / B_CAM) + sx;
  const dy = sy + G.camKick * 18;

  ctx.save();
  ctx.translate(dx, dy);
  drawSky(); drawGround(); drawHorizon(); drawBloom(); drawRoad(); drawRoadPatterns();
  drawSideDiscs(); drawEntities(); drawPlayer(); drawTrail(); drawFx();
  ctx.restore();

  if (G.mode !== "intro" && G.mode !== "help") drawHud();
  if (G.mode === "intro") drawIntro();
  if (G.mode === "countdown") drawCountdown();
  if (G.mode === "collapse" && G.collapseT > SKIP_AFTER) {
    ctx.fillStyle = "rgba(200,235,245,0.45)";
    ctx.font = FONT(13);
    ctx.textAlign = "center";
    ctx.fillText("空格 / 点击 · 跳过", W / 2, H * 0.72);
    ctx.textAlign = "left";
  }

  if (G.mode === "help") drawHelp();
  if (G.mode === "pause") drawPause();
  if (G.mode === "lose") drawLose();
  drawBigText();
  drawFlash();
}

function drawFlash() {
  if (G.flash <= 0.001) return;
  ctx.fillStyle = `rgba(232,252,255,${G.flash})`;
  ctx.fillRect(0, 0, W, H);
}

function drawSky() {
  const e = env(), hy = horizonY();
  const top = e.top, hor = mix(mix(e.hor, e.lane, 0.20), "#ffffff", 0.07);
  const steps = 56;
  for (let i = 0; i < steps; i++) {
    const k0 = i / steps, k1 = (i + 1) / steps;
    ctx.fillStyle = mix(top, hor, Math.pow(k0, 2.6));
    ctx.fillRect(-EDGE_PAD, hy * k0, W + EDGE_PAD * 2, hy * (k1 - k0) + 1);
  }
  // 星点
  ctx.fillStyle = "rgba(191,234,255,0.75)";
  for (let i = 0; i < 120; i++) {
    const x = (hash01(i * 3.1) * W) | 0;
    const y = (hash01(i * 7.7) * hy * 0.92) | 0;
    const tw = 0.55 + 0.45 * Math.sin(G.fxT * 1.7 + i);
    ctx.globalAlpha = 0.25 + 0.5 * hash01(i * 5.3) * tw;
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawGround() {
  const e = env(), hy = horizonY();
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const k0 = i / steps, k1 = (i + 1) / steps;
    ctx.fillStyle = mix(e.groundFar, e.groundNear, Math.pow(k0, 0.6));
    ctx.fillRect(-EDGE_PAD, hy + (H - hy) * k0, W + EDGE_PAD * 2, (H - hy) * (k1 - k0) + 1);
  }
  // 天地过渡带
  const bandH = 90, bs = 16;
  for (let i = 0; i < bs; i++) {
    const t0 = i / bs, a = 0.55 * Math.pow(1 - t0, 1.5);
    ctx.fillStyle = rgba(e.hor, a);
    ctx.fillRect(-EDGE_PAD, hy + bandH * t0, W + EDGE_PAD * 2, (bandH / bs) + 1);
  }
}

function drawHorizon() {
  const e = env(), hy = horizonY();
  // 天空侧柔光
  for (let k = 0; k < 16; k++) {
    const t = 1 - k / 15, half = 2 + 34 * t * t, a = 0.16 * Math.pow(1 - t, 2.2);
    ctx.fillStyle = rgba(mix(e.edge, "#ffffff", 0.35), a);
    ctx.fillRect(-EDGE_PAD, hy - half, W + EDGE_PAD * 2, half);
  }
  // 远山脊（与 main2d 同构：整数序号驱动形状，dist 只做平移）
  const N = 9, SEG = 84;
  const segs = [], period = { v: 0 };
  for (let n = 0; n < N; n++) { const sg = SEG * (0.78 + hash01(n) * 0.50); segs.push(sg); period.v += sg; }
  const off = (G.dist * 0.16) % period.v;
  ctx.beginPath();
  let x = -period.v - 20 - off;
  ctx.moveTo(x, hy + 12);
  let i = 0;
  while (x <= W + 40) {
    const n = i % N, seg = segs[n], f = n;
    const valley = 6 + hash01(f + 11.3) * 7;
    const cluster = 0.85 + hash01(Math.floor(n / 3) + 5.5) * 0.45;
    const peak = (14 + hash01(f + 7.7) * 14) * cluster;
    const lean = 0.34 + hash01(f + 3.1) * 0.32;
    ctx.lineTo(x, hy - valley);
    ctx.lineTo(x + seg * lean, hy - peak);
    x += seg;
    ctx.lineTo(x, hy - valley);
    i++;
  }
  ctx.lineTo(x, hy + 12);
  ctx.closePath();
  ctx.fillStyle = "rgba(6,22,30,0.62)";
  ctx.fill();
  // 近处三座剪影山
  const scroll = G.dist % 320;
  for (let j = 0; j < 4; j++) {
    const bx = ((j * 220 - scroll * 0.45) % 900) - 90;
    const w = 66 + j * 12, h = 22 + j * 5;
    ctx.fillStyle = "rgba(6,22,30,0.62)";
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.5, hy + 24);
    ctx.lineTo(bx - w * 0.32, hy + 4 - h);
    ctx.lineTo(bx + w * 0.12, hy + 4 - h * 1.18);
    ctx.lineTo(bx + w * 0.5, hy + 24);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBloom() {
  const e = env(), hy = horizonY();
  const hl = mix(e.edge, "#ffffff", 0.45);
  for (let k = 0; k < 20; k++) {
    const t = 1 - k / 19, half = 1 + 31 * t * t, a = 0.090 * Math.pow(1 - t, 1.8);
    ctx.fillStyle = rgba(hl, a);
    ctx.fillRect(-EDGE_PAD, hy - half, W + EDGE_PAD * 2, half * 2);
  }
  for (let k = 0; k < 6; k++) {
    const t2 = 1 - k / 5, half2 = 0.6 + 4.5 * t2;
    ctx.fillStyle = `rgba(255,255,255,${0.06 * Math.pow(1 - t2, 1.5)})`;
    ctx.fillRect(-EDGE_PAD, hy - half2, W + EDGE_PAD * 2, half2 * 2);
  }
  // 空气透视（雾带 + 余辉）
  const haze = mix(e.hor, hl, 0.45);
  for (let k = 0; k < 14; k++) {
    const u = k / 13, yy = hy + 9 - u * 39, a = 0.115 * Math.pow(1 - u, 2.2);
    ctx.fillStyle = rgba(haze, a);
    ctx.fillRect(-EDGE_PAD, yy, W + EDGE_PAD * 2, 3.2);
  }
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = rgba(hl, 0.10 - 0.02 * k);
    ctx.fillRect(-EDGE_PAD, hy - (1.2 + k * 1.6) / 2, W + EDGE_PAD * 2, 1.2 + k * 1.6);
  }
  // 亮芯
  ctx.fillStyle = rgba(hl, 0.55);
  ctx.fillRect(-EDGE_PAD, hy - 1.3, W + EDGE_PAD * 2, 2.6);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fillRect(-EDGE_PAD, hy - 0.65, W + EDGE_PAD * 2, 1.3);
}

function drawRoad() {
  const e = env(), sh = horizonArc();
  const laneHalf = (LANE_W * 3) / 2;
  // 路面
  ctx.beginPath();
  const a = project(-8, -laneHalf), b = project(-8, laneHalf);
  const c = project(sh, laneHalf), d = project(sh, -laneHalf);
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, horizonY(), 0, H);
  g.addColorStop(0, e.groundFar);
  g.addColorStop(1, mix(e.groundNear, e.lane, 0.10));
  ctx.fillStyle = g;
  ctx.fill();
  // 车道线
  for (const lx of [-LANE_W * 1.5, -LANE_W * 0.5, LANE_W * 0.5, LANE_W * 1.5]) {
    ctx.beginPath();
    let s = -8;
    while (s < sh) {
      const p = project(s, lx);
      if (s === -8) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      s += 6;
    }
    ctx.strokeStyle = rgba(e.lane, 0.32);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  // 刻度
  for (let s = 0; s < sh; s += 20) {
    const p1 = project(s - G.dist + (G.dist % 20), -laneHalf), p2 = project(s - G.dist + (G.dist % 20), laneHalf);
    if (p1.y > horizonY() + 6) {
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = rgba(e.lane, 0.07); ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function drawRoadPatterns() {
  // 简化：只画水波纹（第 1 关母题），其它关省略
  const e = env();
  const sh = horizonArc() - 2;
  for (let s = -10; s < sh; s += 10) {
    ctx.beginPath();
    for (let j = 0; j < 9; j++) {
      const x = -4.6 + (9.2 * j) / 8;
      const p = project(s + Math.sin(x * 1.7 + s * 0.2) * 0.35, x);
      if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = rgba(e.lane, 0.10);
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

function drawSideDiscs() {
  const e = env();
  const shape = sideShapeOf(G.level.id);
  const sz = sideScaleOf(G.level.id);
  const sp = sideSpeedOf(G.level.id) / Math.sqrt(Math.max(0.5, sz));
  const wallFill = mix(mix(e.edge, e.groundFar, 0.5), "#000000", 0.16);
  const wallEdge = mix(e.edge, "#ffffff", 0.48);
  const SIDE_STEP = 5.2, SIDE_SLOTS = 24, SIDE_MOTION = 2.0, SIDE_DRIFT = 0.9;
  const span = SIDE_STEP * SIDE_SLOTS;
  for (let i = 0; i < SIDE_SLOTS; i++) {
    const s = hash01(i * 1.37 + 0.11), s2 = hash01(i * 2.71 + 3.70);
    const jit = 0.62 + s * 0.95;
    const travel = (G.dist * SIDE_MOTION + SIDE_DRIFT * G.fxT) * jit * sp;
    const rel = ((i * SIDE_STEP - travel) % span + span) % span - 8;
    if (rel < -3 || rel > 104) continue;
    const side = i % 2 === 0 ? -1 : 1;
    const xOff = side * (LANE_W * 1.5 + 0.5 + s * 2.4);
    const hgt = 0.55 + s2 * 2.1 + Math.sin(G.fxT * 0.9 + s * 6.28) * 0.12;
    const sway = Math.sin(G.fxT * 0.75 + s2 * 6.28) * 0.30;
    const p = project(rel, xOff + sway, hgt);
    const r = (0.15 + s2 * 0.30) * scaleAt(rel) * sz;
    if (r < 0.8) continue;
    const a = 0.20 + s * 0.10;
    const fade = clamp(1 - (rel - 64) / 38, 0, 1);
    drawSideShape(shape, p, r, wallFill, wallEdge, a * fade, s2);
  }
}
// 赛道两侧装饰外形（D-64）：与 Godot 版 13 种一一对应，颜色取当关 wall_fill/wall_edge
// p: {x,y}，r: 半径像素，fill/line: 十六进制色，a: 已乘距离淡出的透明度，s2: 每片固定随机
function drawSideShape(shape, p, r, fill, line, a, s2) {
  const fa = clamp(a, 0, 1);
  const fc = rgba(fill, fa);
  const lc = rgba(line, Math.min(1, fa * 1.25));
  const lw = Math.max(0.7, r * 0.11);
  const small = r < 9;
  let ang = 0;
  if (shape === "tetra" || shape === "hex" || shape === "ribbon") {
    ang = Math.sin(G.fxT * 0.55 + s2 * 6.283) * (8 * Math.PI / 180);
  }
  const rot = (dx, dy) => ({
    x: p.x + dx * Math.cos(ang) - dy * Math.sin(ang),
    y: p.y + dx * Math.sin(ang) + dy * Math.cos(ang),
  });
  const poly = (pts, close) => {
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    if (close) ctx.closePath();
  };
  switch (shape) {
    case "rain": {
      if (small) {
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r * 1.4); ctx.lineTo(p.x, p.y + r * 1.4);
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(1, lw); ctx.stroke();
      } else {
        const w = r * 0.38, h = r * 1.45, pts = [];
        for (let k = 0; k < 12; k++) {
          const th = (Math.PI * 2 * k) / 12;
          pts.push({ x: p.x + Math.cos(th) * w, y: p.y + Math.sin(th) * h });
        }
        poly(pts, true); ctx.fillStyle = fc; ctx.fill();
        ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - r * 0.22, p.y + h * 0.75); ctx.lineTo(p.x - r * 0.22, p.y + h * 1.75);
        ctx.moveTo(p.x + r * 0.2, p.y + h * 0.55); ctx.lineTo(p.x + r * 0.2, p.y + h * 1.3);
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.6); ctx.stroke();
      }
      break;
    }
    case "tetra": {
      const pts = [
        { x: p.x, y: p.y - r * 1.1 },
        { x: p.x + r * 0.95, y: p.y + r * 0.62 },
        { x: p.x - r * 0.95, y: p.y + r * 0.62 },
      ];
      poly(pts, true); ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
      if (!small) {
        ctx.beginPath();
        pts.forEach((q) => { ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); });
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.6); ctx.stroke();
      }
      break;
    }
    case "pyramid": {
      const pts = [
        { x: p.x, y: p.y - r * 0.7 },
        { x: p.x + r * 0.9, y: p.y + r * 0.75 },
        { x: p.x - r * 0.9, y: p.y + r * 0.75 },
      ];
      poly(pts, true); ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x, p.y - r * 1.55, Math.max(1, r * 0.2), 0, Math.PI * 2);
      ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.7); ctx.stroke();
      break;
    }
    case "droplet": {
      ctx.beginPath(); ctx.arc(p.x - r * 0.25, p.y + r * 0.1, r * 0.72, 0, Math.PI * 2);
      ctx.fillStyle = fc; ctx.fill(); ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x + r * 0.75, p.y - r * 0.62, r * 0.42, 0, Math.PI * 2);
      ctx.fillStyle = fc; ctx.fill();
      if (!small) { ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.6, lw * 0.7); ctx.stroke(); }
      break;
    }
    case "hex": {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const th = (Math.PI * 2 * k) / 6 - Math.PI * 0.5;
        pts.push(rot(Math.cos(th) * r, Math.sin(th) * r));
      }
      poly(pts, true); ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
      if (!small) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[3].x, pts[3].y);
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.7); ctx.stroke();
      }
      break;
    }
    case "triple": {
      const xs = [-r * 0.8, -r * 0.12, r * 0.55];
      const hs = [r * 1.05, r * 0.78, r * 1.3];
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        ctx.moveTo(p.x + xs[k], p.y - hs[k] * 0.5);
        ctx.lineTo(p.x + xs[k], p.y + hs[k] * 0.5);
      }
      ctx.strokeStyle = lc; ctx.lineWidth = Math.max(1.2, r * 0.26); ctx.stroke();
      break;
    }
    case "carbonyl": {
      const pts = [];
      for (let k = 0; k < 12; k++) {
        const th = (Math.PI * 2 * k) / 12;
        pts.push({ x: p.x + Math.cos(th) * r * 0.8, y: p.y + Math.sin(th) * r * 0.55 });
      }
      poly(pts, true); ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x + r * 1.05, p.y - r * 0.15, Math.max(1, r * 0.22), 0, Math.PI * 2);
      ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.7); ctx.stroke();
      break;
    }
    case "beads": {
      const b = [
        { x: p.x - r * 0.78, y: p.y + r * 0.18 },
        { x: p.x, y: p.y - r * 0.28 },
        { x: p.x + r * 0.78, y: p.y + r * 0.12 },
      ];
      ctx.beginPath(); ctx.moveTo(b[0].x, b[0].y); ctx.lineTo(b[1].x, b[1].y); ctx.lineTo(b[2].x, b[2].y);
      ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.7, lw * 0.7); ctx.stroke();
      b.forEach((q) => {
        ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1.2, r * 0.34), 0, Math.PI * 2);
        ctx.fillStyle = fc; ctx.fill();
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.6, lw * 0.7); ctx.stroke();
      });
      break;
    }
    case "nucleotide": {
      const bw = r * 0.42, rad = Math.max(0.5, bw * 0.35);
      const blocks = [
        { x: p.x - bw * 0.5, y: p.y - r * 0.95, w: bw, h: r * 1.5 },
        { x: p.x - bw * 0.5, y: p.y + r * 0.35, w: r * 1.35, h: bw },
        { x: p.x + r * 0.5, y: p.y + r * 0.35, w: bw * 0.8, h: bw * 0.8 },
      ];
      blocks.forEach((bb) => {
        roundRect(bb.x, bb.y, bb.w, bb.h, rad);
        ctx.fillStyle = fc; ctx.fill();
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.6, lw * 0.8); ctx.stroke();
      });
      break;
    }
    case "ribbon": {
      const n = small ? 9 : 13;
      const pts = [], pts2 = [];
      for (let k = 0; k < n; k++) {
        const tt = k / (n - 1);
        const xx = lerp(-r, r, tt);
        const yy = Math.sin(tt * Math.PI * 2) * r * 0.55;
        pts.push(rot(xx, yy));
        pts2.push(rot(xx, yy + r * 0.42));
      }
      poly(pts, false); ctx.strokeStyle = lc; ctx.lineWidth = Math.max(1, r * 0.22); ctx.stroke();
      if (!small) {
        poly(pts2, false); ctx.strokeStyle = rgba(line, fa * 1.25 * 0.75); ctx.lineWidth = Math.max(0.8, r * 0.18); ctx.stroke();
      }
      break;
    }
    case "hairpin": {
      ctx.beginPath(); ctx.moveTo(p.x, p.y + r * 1.15); ctx.lineTo(p.x, p.y - r * 0.15);
      ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.8, lw * 0.9); ctx.stroke();
      if (small) {
        ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.85, r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = lc; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.85, r * 0.55, 0, Math.PI * 2);
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.8, lw); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y - r * 0.85, r * 0.28, 0, Math.PI * 2);
        ctx.fillStyle = fc; ctx.fill();
      }
      break;
    }
    case "helix": {
      const m = small ? 9 : 13;
      const q1 = [], q2 = [], rungs = [];
      for (let k = 0; k < m; k++) {
        const t2 = k / (m - 1);
        const x2 = lerp(-r, r, t2);
        const ph = t2 * Math.PI * 2;
        const a1 = { x: p.x + x2, y: p.y + Math.sin(ph) * r * 0.55 };
        const a2 = { x: p.x + x2, y: p.y - Math.sin(ph) * r * 0.55 };
        q1.push(a1); q2.push(a2); rungs.push([a1, a2]);
      }
      poly(q1, false); ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.9, r * 0.16); ctx.stroke();
      poly(q2, false); ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.9, r * 0.16); ctx.stroke();
      if (!small) {
        ctx.beginPath();
        [3, 6, 9].forEach((k) => {
          if (k < rungs.length) { ctx.moveTo(rungs[k][0].x, rungs[k][0].y); ctx.lineTo(rungs[k][1].x, rungs[k][1].y); }
        });
        ctx.strokeStyle = lc; ctx.lineWidth = Math.max(0.6, lw * 0.6); ctx.stroke();
      }
      break;
    }
    default: {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = fc; ctx.fill();
      ctx.strokeStyle = lc; ctx.lineWidth = lw; ctx.stroke();
    }
  }
}


function drawEntities() {
  const e = env();
  for (const ent of G.entities) {
    const rel = ent.s - G.dist;
    if (rel < -6 || rel > horizonArc()) continue;
    if (ent.kind === "atom") {
      const p = project(rel, laneX(ent.lane), 0.9);
      const r = 0.30 * scaleAt(rel);
      const col = MODULE_COLOR[ent.type] || COL_CYAN;
      const label = MODULE_LABEL[ent.type] || "?";
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.9, 0, TAU);
      ctx.fillStyle = rgba(col, 0.12); ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = "rgba(10,26,32,0.92)";
      ctx.font = FONT(Math.max(9, Math.min(26, r * 0.95)), true);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(label, p.x, p.y + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    } else if (ent.kind === "wall") {
      const c = project(rel, laneX(ent.lane), 0.75);
      const r = 0.85 * scaleAt(rel);
      const fill = mix(mix(e.edge, e.groundFar, 0.5), "#000000", 0.16);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - r * 1.35); ctx.lineTo(c.x + r * 0.85, c.y);
      ctx.lineTo(c.x, c.y + r * 1.35); ctx.lineTo(c.x - r * 0.85, c.y);
      ctx.closePath();
      ctx.fillStyle = rgba(fill, 0.85); ctx.fill();
      ctx.strokeStyle = rgba(mix(e.edge, "#ffffff", 0.48), 0.9);
      ctx.lineWidth = Math.max(1.6, r * 0.13); ctx.stroke();
    } else if (ent.kind === "gate") {
      const cc = project(rel, laneX(ent.lane), 0.95);
      const pulse = gatePulseOf(ent);

      const r = 1.05 * scaleAt(rel) * (1 + pulse);
      const c = cc;
      const ok = targetComplete();
      // 门色跟场景走（与 Godot 版同一条规则：edge 与 accent 混色，只提亮 25%）
      const gateCol = mix(mix(env().edge, env().accent, 0.5), "#ffffff", 0.25);
      const col = ok ? mix(gateCol, "#ffffff", 0.45) : gateCol;
      // 撞门时：放大 → 缩小；亮度跟着走（大 = 亮且偏白，小 = 暗）（D-66）
      const boost = 1 + pulse * 2.4;
      const tc = mix(col, "#ffffff", pulse * 0.55);
      for (let k = 0; k < 4; k++) {
        const f = lerp(0.56, 1.0, k / 3);
        const w = Math.max(1, r * lerp(0.045, 0.10, k / 3));
        const ca = clamp(lerp(0.20, 0.90, Math.pow(k / 3, 1.25)) * boost, 0, 1);
        ctx.beginPath(); ctx.arc(c.x, c.y, r * f, 0, TAU);
        ctx.strokeStyle = rgba(tc, ca); ctx.lineWidth = w; ctx.stroke();
      }
      ctx.fillStyle = rgba(tc, 0.95);
      ctx.font = FONT(Math.max(10, Math.min(30, r * 0.6)), true);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(G.level.formula, c.x, c.y);
      // 门里的原子/分子：常亮（D-69 去掉了依次点亮，跑太快看不清）
      const mods = G.level.modules;
      const n = mods.length;
      const dotSpan = Math.min(r * 1.5, n * 14);
      const dotX0 = c.x - dotSpan / 2;
      for (let i = 0; i < n; i++) {
        const mx = dotX0 + (dotSpan / Math.max(n, 1)) * (i + 0.5);
        ctx.beginPath(); ctx.arc(mx, c.y + r * 0.42, 4, 0, TAU);
        ctx.fillStyle = rgba(MODULE_COLOR[mods[i]] || "#78efff", 1); ctx.fill();
      }
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    }
  }
}

function drawPlayer() {
  if (G.playerHidden) return;
  const c = project(0, G.laneXv, 0.59);
  const k = scaleAt(0);
  const rim = mix(PLAYER_RIM, env().accent, 0.30);
  // 下划压扁：越按越扁，然后弹回（D-35）
  const dip = G.bondDip >= 0 ? dipCurve(G.bondDip) : { x: 1, y: 1 };
  const rx = 0.6 * k * dip.x, ry = 0.6 * k * dip.y;
  // 地面摩擦光：两条白色扁椭圆，随时间收缩淡出
  if (G.frictionT > 0) {
    const gk = clamp(G.frictionT / 0.20, 0, 1);
    const gp = project(0, G.laneXv, 0.12);
    ctx.beginPath();
    ctx.ellipse(gp.x, gp.y, 46 * gk + 12, 9 * gk + 3, 0, 0, TAU);
    ctx.fillStyle = rgba("#ffffff", 0.30 * gk); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(gp.x, gp.y, 22 * gk + 6, 4.5 * gk + 2, 0, 0, TAU);
    ctx.fillStyle = rgba("#ffffff", 0.55 * gk); ctx.fill();
  }
  // 底部光晕
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, ry * 2.6);
  g.addColorStop(0, rgba(rim, 0.16)); g.addColorStop(1, rgba(rim, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, ry * 2.6, 0, TAU); ctx.fill();
  // 球体
  ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = mix(PLAYER_BODY, env().accent, 0.06); ctx.fill();
  // 滚纹（向上翻：th = theta0 - roll）
  const roll = (G.dist * 0.22) % TAU;
  const markCol = mix(rim, "#ffffff", 0.35);
  for (let i = 0; i < 6; i++) {
    const th0 = (TAU * i) / 6 + i * 0.7;
    const phi = -0.55 + 0.22 * (i % 3);
    const th = th0 - roll;
    const depth = Math.sin(th) * Math.cos(phi);
    if (depth <= 0.08) continue;
    const sx = Math.sin(th) * Math.sin(phi) * rx;
    const sy = -Math.cos(th) * ry;
    ctx.beginPath();
    ctx.arc(c.x + sx, c.y + sy, Math.max(1, rx * (0.085 + 0.06 * depth)), 0, TAU);
    ctx.fillStyle = rgba(markCol, 0.16 + 0.30 * depth); ctx.fill();
  }
  // 内圈 + 外圈
  ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 0.95, ry * 0.95, 0, 0, TAU);
  ctx.strokeStyle = rgba(PLAYER_INNER, 0.75); ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 1.32, ry * 1.32, 0, 0, TAU);
  ctx.strokeStyle = rgba(rim, 0.95); ctx.lineWidth = 2.5; ctx.stroke();
  // 高光（固定不动）
  ctx.beginPath(); ctx.arc(c.x - rx * 0.3, c.y - ry * 0.35, Math.min(rx, ry) * 0.26, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
}

function drawTrail() {
  if (!G.collected.length || G.playerHidden) return;
  const k = scaleAt(0);
  let prev = project(0, G.laneXv, 0.59);
  for (let i = 0; i < Math.min(3, G.collected.length); i++) {
    const sway = Math.sin((i + 1) * 0.95 + G.fxT * 0.45) * 0.22;
    const p = project(0, G.laneXv + sway, TRAIL_H[i]);
    const r = 0.26 * k;
    const col = MODULE_COLOR[G.collected[i]] || COL_CYAN;
    ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = rgba(PLAYER_RIM, 0.35); ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.6, 0, TAU);
    ctx.fillStyle = rgba(col, 0.16); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.fillStyle = "rgba(10,26,32,0.9)";
    ctx.font = FONT(Math.max(8, r * 0.95), true);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(MODULE_LABEL[G.collected[i]] || "?", p.x, p.y + 1);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    prev = p;
  }
}

function drawFx() {
  // 地面残骸
  for (const r of G.residue) {
    const k = r.t / r.life;
    ctx.beginPath(); ctx.ellipse(r.p.x, r.p.y, r.size * (1 - k * 0.5), r.size * 0.4 * (1 - k * 0.5), 0, 0, TAU);
    ctx.fillStyle = `rgba(120,160,170,${0.30 * (1 - k)})`; ctx.fill();
  }
  // 撞击波
  for (const w of G.waves) {
    const k = clamp(w.t / w.life, 0, 1);
    const rad = lerp(w.r0, w.r1, 1 - Math.pow(1 - k, 2.6));
    const fade = Math.pow(1 - k, 1.4);
    const col = w.color || "#ffffff";
    ctx.beginPath(); ctx.arc(w.p.x, w.p.y, rad * 0.30, 0, TAU);
    ctx.fillStyle = rgba(col, 0.18 * fade * w.power); ctx.fill();
    const specs = [[0.52, 0.95], [0.76, 0.55], [1.0, 0.28]];
    ctx.lineWidth = 2 + 1.6 * clamp(w.power, 0.3, 2.0);
    for (const [f, bright] of specs) {
      ctx.beginPath(); ctx.arc(w.p.x, w.p.y, rad * f, 0, TAU);
      ctx.strokeStyle = rgba(col, fade * w.power * bright); ctx.stroke();
    }
  }
  // 碎块
  for (const s of G.shards) {
    const k = s.t / s.life, fade = 1 - k;
    ctx.save();
    ctx.translate(s.p.x, s.p.y); ctx.rotate(s.rot);
    const sz = s.size * (1 - 0.4 * k);
    ctx.beginPath();
    ctx.moveTo(-sz, sz * 0.6); ctx.lineTo(0, -sz); ctx.lineTo(sz * 0.8, sz * 0.5);
    ctx.closePath();
    ctx.fillStyle = rgba(s.color, 0.85 * fade); ctx.fill();
    ctx.restore();
  }
  // 火星 / 碎屑
  for (const d of G.dust) {
    const k = clamp(d.t / d.life, 0, 1);
    const fade = d.shrink ? 1 - k : Math.pow(1 - k, 2);
    const sz = d.shrink ? d.size * (1 - k) : d.size * (1 - 0.5 * k);
    if (sz <= 0.2) continue;
    ctx.beginPath(); ctx.arc(d.p.x, d.p.y, sz, 0, TAU);
    ctx.fillStyle = rgba(d.color, fade * 0.9 * (d.a0 ?? 1)); ctx.fill();
  }
  for (const s of G.sparks) {
    const k = clamp(s.t / s.life, 0, 1), fade = Math.pow(1 - k, 1.6);
    ctx.beginPath(); ctx.arc(s.p.x, s.p.y, Math.max(0.6, s.size * (1 - 0.7 * k)), 0, TAU);
    ctx.fillStyle = rgba(s.color, fade * 0.95); ctx.fill();
  }
}

// ───────────────────────── HUD ─────────────────────────
function drawHud() {
  const e = env();
  const lane = e.lane;
  ctx.textBaseline = "alphabetic";
  // 标题
  ctx.fillStyle = "rgba(240,252,255,0.95)";
  ctx.font = FONT(22, true);
  ctx.fillText("碳途纪元", 20, 40);
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(158,199,209,0.72)";
  ctx.fillText(`网页版 · 关卡 ${G.level.id}`, 20, 60);
  // 分数
  ctx.font = FONT(46, true);
  ctx.fillStyle = "rgba(245,255,255,0.96)";
  ctx.fillText(String(G.deliveries), 20, 116);
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(158,199,209,0.75)";
  ctx.fillText("交付分子", 22, 138);
  ctx.fillStyle = "rgba(158,199,209,0.55)";
  ctx.fillText(`目标 ${levelGoal()} 次交付 · ${Math.min(G.deliveries, levelGoal())}/${levelGoal()}`, 22, 158);
  // 目标槽
  const specs = G.level.modules;
  ctx.textAlign = "center";
  ctx.font = FONT(13);
  ctx.fillStyle = "rgba(178,219,230,0.85)";
  ctx.fillText(`目标 ${G.level.formula}`, W / 2, 34);
  const slotR = 17, gap = 12;
  const totalW = specs.length * (slotR * 2) + (specs.length - 1) * gap;
  let x0 = W / 2 - totalW / 2;
  for (let i = 0; i < specs.length; i++) {
    const cx = x0 + slotR + i * (slotR * 2 + gap);
    const cy = 72;
    const mod = specs[i];
    const col = MODULE_COLOR[mod] || COL_CYAN;
    const filled = i < G.collected.length;
    ctx.beginPath(); ctx.arc(cx, cy, slotR, 0, TAU);
    if (filled) {
      ctx.fillStyle = rgba(col, 0.9); ctx.fill();
      ctx.fillStyle = "rgba(10,26,32,0.92)";
      ctx.font = FONT(15, true);
      ctx.fillText(MODULE_LABEL[mod] || "?", cx, cy + 5);
    } else {
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = rgba(col, 0.75);
      ctx.font = FONT(15, true);
      ctx.fillText(MODULE_LABEL[mod] || "?", cx, cy + 5);
    }
  }
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(178,219,230,0.72)";
  ctx.fillText(targetComplete() ? "结构正确 · 寻找分子门" : `还需 ${remainingAtoms()} 个原子`, W / 2, 116);
  // 底部信息
  ctx.textAlign = "left";
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(168,209,219,0.55)";
  ctx.fillText(`弧长 ${Math.floor(G.dist)} u`, 22, H - 56);
  ctx.fillText(`撞墙 ${G.hits} 次`, 22, H - 34);
  // 底部三键（居中）
  const btnY = H - 96 + 28;
  const labels = ["‹", "↓", "›"];
  for (let i = 0; i < 3; i++) {
    const bx = W / 2 - 104 + i * 80 + 28;
    ctx.beginPath(); ctx.arc(bx, btnY, 28, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,0.18)`; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = "rgba(240,252,255,0.92)";
    ctx.font = FONT(22, true);
    ctx.textAlign = "center";
    ctx.fillText(labels[i], bx, btnY + 8);
    ctx.textAlign = "left";
  }
  // 静音 / 暂停（占位按钮，点击区域在 input 里）
  for (let i = 0; i < 2; i++) {
    const bx = W - 64 - i * 56, by = 40;
    ctx.beginPath(); ctx.arc(bx, by, 22, 0, TAU);
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = "rgba(240,252,255,0.85)";
    ctx.font = FONT(15, true);
    ctx.textAlign = "center";
    ctx.fillText(i === 0 ? "Ⅱ" : (MUTED ? "✕" : "♪"), bx, by + 5);
    ctx.textAlign = "left";
  }
  ctx.textAlign = "left";
}

function drawBigText() {
  if (G.bigTextA <= 0.01 || G.mode === "menu") return;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = FONT(34, true);
  const a = G.bigTextA;
  ctx.shadowColor = rgba(G.bigTextColor, 0.45 * a);
  ctx.shadowBlur = 18;
  ctx.fillStyle = rgba(mix(G.bigTextColor, "#ffffff", 0.55), a);
  ctx.fillText(G.bigText, W / 2, 330);
  ctx.restore();
  ctx.textAlign = "left";
}

// ───────────────────────── 菜单 / 介绍 / 倒计时 / 结算 ─────────────────────────
const MARGIN = 32, CARD_W = 208, CARD_H = 150, GAP = 18, GRID_TOP = 150, COLS = 3;
const cardRect = (i) => {
  const col = i % COLS, row = Math.floor(i / COLS);
  return { x: MARGIN + col * (CARD_W + GAP), y: GRID_TOP + row * (CARD_H + GAP), w: CARD_W, h: CARD_H };
};
const startRect = () => ({ x: MARGIN, y: 1130, w: W - MARGIN * 2, h: 64 });

function drawMenu() {
  ctx.fillStyle = "rgba(2,7,10,0.96)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(234,252,255,0.96)";
  ctx.font = FONT(26, true);
  ctx.fillText("关卡选择", MARGIN, 62);
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(154,196,207,0.8)";
  ctx.fillText("选择要合成的分子 · 通关解锁下一关", MARGIN, 90);
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(120,239,255,0.9)";
  ctx.fillText(`已解锁 ${Math.min(save.unlocked, LEVELS.length)} / ${LEVELS.length}`, W - MARGIN, 62);
  ctx.textAlign = "left";

  LEVELS.forEach((lv, i) => {
    const r = cardRect(i), locked = i + 1 > save.unlocked, sel = i === G.menuSel;
    const envc = ENV[lv.environment] || ENV.primordial_ocean;
    ctx.save();
    if (sel) { ctx.translate(r.x + r.w / 2, r.y + r.h / 2); ctx.scale(1.03, 1.03); ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2)); }
    roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.fillStyle = locked ? "rgba(6,20,26,0.75)" : "rgba(6,20,26,0.94)";
    ctx.fill();
    ctx.strokeStyle = sel ? "rgba(120,239,255,0.95)" : "rgba(41,92,107,0.9)";
    ctx.lineWidth = sel ? 2 : 1;
    ctx.stroke();
    // 顶部色条
    roundRect(r.x + 1, r.y, r.w - 2, 4, 2);
    ctx.fillStyle = locked ? "rgba(120,140,150,0.35)" : rgba(envc.edge, 0.9);
    ctx.fill();
    ctx.textAlign = "center";
    ctx.font = FONT(13);
    ctx.fillStyle = "rgba(154,196,207,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(String(lv.id).padStart(2, "0"), r.x + 12, r.y + 24);
    ctx.textAlign = "right";
    const best = save.best[lv.id] || 0;
    ctx.fillText(locked ? "未解锁" : best > 0 ? `最佳 ${best}` : "未通关", r.x + r.w - 12, r.y + 24);
    ctx.textAlign = "center";
    ctx.font = FONT(lv.formula.length > 8 ? 16 : 22, true);
    ctx.fillStyle = locked ? "rgba(150,170,180,0.5)" : "rgba(234,252,255,0.96)";
    ctx.fillText(lv.formula, r.x + r.w / 2, r.y + 62);
    ctx.font = FONT(11);
    ctx.fillStyle = locked ? "rgba(150,170,180,0.45)" : "rgba(154,196,207,0.9)";
    ctx.fillText(lv.name, r.x + r.w / 2, r.y + 84);
    // 模块小球
    const n = lv.modules.length, rr = 9, g2 = 6;
    const totW = n * rr * 2 + (n - 1) * g2;
    let mx = r.x + r.w / 2 - totW / 2;
    for (let k = 0; k < n; k++) {
      const col = MODULE_COLOR[lv.modules[k]] || COL_CYAN;
      ctx.beginPath(); ctx.arc(mx + rr, r.y + 110, rr, 0, TAU);
      ctx.fillStyle = locked ? "rgba(120,140,150,0.35)" : rgba(col, 0.92); ctx.fill();
      ctx.fillStyle = "rgba(10,26,32,0.9)";
      ctx.font = FONT(9, true);
      ctx.fillText(MODULE_LABEL[lv.modules[k]] || "?", mx + rr, r.y + 113);
      mx += rr * 2 + g2;
    }
    ctx.fillStyle = locked ? "rgba(150,170,180,0.4)" : "rgba(154,196,207,0.8)";
    ctx.font = FONT(11);
    ctx.fillText(`目标 ×${lv.goal} 交付`, r.x + r.w / 2, r.y + 136);
    ctx.restore();
  });

  const sr = startRect();
  roundRect(sr.x, sr.y, sr.w, sr.h, 26);
  ctx.fillStyle = "rgba(163,242,255,0.95)"; ctx.fill();
  ctx.fillStyle = "rgba(8,33,41,0.95)";
  ctx.font = FONT(18, true);
  ctx.textAlign = "center";
  ctx.fillText(`开始 · 第 ${LEVELS[G.menuSel].id} 关`, sr.x + sr.w / 2, sr.y + sr.h / 2 + 6);
  ctx.font = FONT(12);
  ctx.fillStyle = "rgba(154,196,207,0.8)";
  ctx.fillText("←↑↓→ / WASD 选择 · Enter 开始 · 点卡片直接进", W / 2, 1250);
  ctx.font = FONT(12);
  ctx.fillStyle = MUTED ? "rgba(154,196,207,0.55)" : "rgba(120,239,255,0.7)";
  ctx.fillText(MUTED ? "♪ 已静音 · 按 M 或点右上 ♪ 开启声音" : "♪ 背景音已开启 · 按 M 或点右上 ♪ 静音", W / 2, 1278);
  ctx.textAlign = "left";
}

function drawIntro() {
  ctx.fillStyle = "rgba(4,10,14,0.80)";
  ctx.fillRect(0, 0, W, H);
  const e = env();
  const panel = { x: 56, y: 144, w: W - 112, h: H - 300 };
  roundRect(panel.x, panel.y, panel.w, panel.h, 28);
  ctx.fillStyle = "rgba(8,23,28,0.94)"; ctx.fill();
  ctx.strokeStyle = rgba(e.lane, 0.35); ctx.lineWidth = 1.6; ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = FONT(20);
  ctx.fillStyle = rgba(e.accent, 0.65);
  ctx.fillText(`第 ${G.level.id} 关`, panel.x + 28, panel.y + 44);
  ctx.font = FONT(30, true);
  ctx.fillStyle = "rgba(234,252,255,0.95)";
  ctx.fillText(G.level.name, panel.x + 28, panel.y + 82);

  drawStructure({ x: W / 2, y: 452 });

  ctx.textAlign = "center";
  ctx.font = FONT(19);
  ctx.fillStyle = "rgba(204,237,245,0.92)";
  wrapText(G.level.intro || "", W / 2, 682, panel.w - 80, 30);
  ctx.font = FONT(18);
  ctx.fillStyle = rgba(e.accent, 0.75);
  ctx.fillText(`目标 ${G.level.formula} · ${G.level.modules.length} 个模块 · 交付 ×${G.level.goal} 过关`,
    panel.x + panel.w / 2, 981);

  const b = G.introBtn;
  roundRect(b.x, b.y, b.w, b.h, 22);
  ctx.fillStyle = rgba(e.lane, G.introHover ? 0.20 : 0.12); ctx.fill();
  ctx.strokeStyle = rgba(e.lane, G.introHover ? 0.95 : 0.7); ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = `rgba(247,255,255,${G.introHover ? 0.98 : 0.88})`;
  ctx.font = FONT(30, true);
  ctx.fillText("开始", b.x + b.w / 2, b.y + b.h * 0.64);
  ctx.font = FONT(15);
  ctx.fillStyle = "rgba(158,204,214,0.55)";
  ctx.fillText("Enter / 空格 也可开始　·　Esc 返回关卡选择", W / 2, H - 42);
  ctx.textAlign = "left";
}

function wrapText(text, cx, y, maxW, lineH) {
  const chars = [...text];
  let line = "", yy = y;
  for (const ch of chars) {
    if (ch === "\n") { ctx.fillText(line, cx, yy); line = ""; yy += lineH; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length) {
      ctx.fillText(line, cx, yy); line = ch; yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawStructure(center) {
  const st = G.level.structure;
  if (st && st.atoms && st.atoms.length) {
    const atoms = st.atoms, bonds = st.bonds || [];
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (const a of atoms) { minx = Math.min(minx, a.x); maxx = Math.max(maxx, a.x); miny = Math.min(miny, a.y); maxy = Math.max(maxy, a.y); }
    const spanX = maxx - minx, spanY = maxy - miny;
    let unit = Math.min(400 / Math.max(spanX, 0.9), 250 / Math.max(spanY, 0.9));
    unit = clamp(unit, 40, 132);
    const midx = (minx + maxx) / 2, midy = (miny + maxy) / 2;
    const pos = atoms.map((a) => ({ x: center.x + (a.x - midx) * unit, y: center.y + (a.y - midy) * unit }));
    const rH = clamp(unit * 0.17, 9, 17), rX = clamp(unit * 0.25, 14, 26);
    const e = env();
    for (const b of bonds) {
      const A = pos[b[0]], B = pos[b[1]], order = b[2] || 1;
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len, gap = 3.4;
      if (order <= 1) {
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
        ctx.strokeStyle = rgba(e.lane, 0.55); ctx.lineWidth = 3; ctx.stroke();
      } else {
        for (let k = 0; k < order; k++) {
          const off = (k - (order - 1) / 2) * gap * 2;
          ctx.beginPath(); ctx.moveTo(A.x + nx * off, A.y + ny * off); ctx.lineTo(B.x + nx * off, B.y + ny * off);
          ctx.strokeStyle = rgba(e.lane, 0.72); ctx.lineWidth = 1.9; ctx.stroke();
        }
      }
    }
    atoms.forEach((a, i) => {
      const r = a.e === "H" ? rH : rX;
      const col = ELEMENT_COLOR[a.e] || "#c0cdd4";
      ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, r * 1.42, 0, TAU);
      ctx.fillStyle = rgba(col, 0.13); ctx.fill();
      ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, r, 0, TAU);
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.78)"; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.font = FONT(Math.round(r * 1.55), true);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(a.e, pos[i].x, pos[i].y + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });
  } else {
    // 模块级示意
    const mods = G.level.modules, n = mods.length;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      let p;
      if (n === 1) p = { x: center.x, y: center.y };
      else if (n === 2) p = { x: center.x + lerp(-92, 92, t), y: center.y };
      else if (n === 3 && String(G.level.geometry).startsWith("bent")) p = { x: center.x + lerp(-104, 104, t), y: center.y + (i === 1 ? 0 : 34) };
      else if (n === 3) p = { x: center.x + lerp(-104, 104, t), y: center.y };
      else { const ang = -Math.PI / 2 + (TAU * t); p = { x: center.x + Math.cos(ang) * 82, y: center.y + Math.sin(ang) * 82 }; }
      pts.push(p);
    }
    for (let i = 1; i < pts.length; i++) {
      ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y); ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = rgba(env().lane, 0.6); ctx.lineWidth = 4; ctx.stroke();
    }
    pts.forEach((p, i) => {
      const col = MODULE_COLOR[mods[i]] || COL_CYAN;
      ctx.beginPath(); ctx.arc(p.x, p.y, 34, 0, TAU);
      ctx.fillStyle = col; ctx.fill();
      ctx.fillStyle = "rgba(10,26,32,0.92)";
      ctx.font = FONT(20, true);
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(MODULE_LABEL[mods[i]] || "?", p.x, p.y + 1);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    });
  }
  // 分子式 + 形状
  ctx.textAlign = "center";
  ctx.font = FONT(18);
  ctx.fillStyle = "rgba(184,237,247,0.8)";
  ctx.fillText(`${G.level.formula}　·　${geometryText(G.level.geometry)}`, center.x, center.y + 152);
  ctx.textAlign = "left";
}

function geometryText(g) {
  const map = {
    linear: "直线 180°", linear_180: "直线 180°", linear_triple: "直线 · 三键",
    bent_104_5: "弯曲 104.5°", trigonal_planar: "平面三角",
    trigonal_pyramidal: "三角锥 107°", trigonal_pyramidal_107: "三角锥 107°",
    tetrahedral: "四面体 109.5°", tetrahedral_109_5: "四面体 109.5°",
    planar_cc_120: "平面 120°", planar_co_120: "平面 120°", methanol_polar: "极性链",
    amino_acid: "氨基酸骨架", nucleotide: "核苷酸三段", folded_protein: "折叠的催化三联体",
    stem_loop: "茎环结构", ribbon: "丝带折叠", double_helix: "双螺旋",
  };
  return map[g] || String(g || "").replace(/_/g, " ");
}

function drawCountdown() {
  const rem = Math.max(G.countdownT, 0);
  const digit = Math.max(1, Math.ceil(rem));
  const frac = 1 - (rem - Math.floor(rem));
  const scale = 0.55 + 1.55 * frac;
  const alpha = clamp(1 - frac * frac, 0, 1);
  ctx.fillStyle = "rgba(3,8,10,0.30)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = `rgba(235,255,255,${alpha})`;
  ctx.font = FONT(Math.round(190 * scale), true);
  ctx.fillText(String(digit), W / 2, H * 0.44 + 190 * scale * 0.34);
  ctx.font = FONT(20);
  ctx.fillStyle = rgba(env().lane, 0.45 * (1 - frac * 0.6));
  ctx.fillText(`准备 · ${G.level.name}`, W / 2, H * 0.72);
  ctx.textAlign = "left";
}

// ─── 首次进入的 4 页操作帮助（D-74）───
const HELP_TOTAL = 4;
const HELP_TITLES = ["目标分子", "左右换道", "下滑成键", "撞门交付"];
const HELP_BODY = [
  "顶部显示本关要凑的分子。收集路上的模块，按结构拼起来 —— 第 1 关是 H₂O：两个 H、一个 O。",
  "用 ← → 或 A / D 在三车道间换道。撞上菱形结构墙会直接湮灭，看到墙要提前让开。",
  "模块进入当前车道、贴近主角时，按 ↓ 或 S 把它吸到链上；位置对了才吸得到。",
  "凑齐结构后撞进前方的分子门，就完成一次交付。达到本关要求的交付次数即过关。",
];
function helpCard() { return { x: 80, y: 300, w: W - 160, h: 840 }; }
function helpButton() {
  const c = helpCard();
  return { x: c.x + 56, y: c.y + c.h - 132, w: c.w - 112, h: 84 };
}
function beginHelp() { G.helpPage = 0; G.mode = "help"; }
function helpNext() {
  if (G.helpPage + 1 < HELP_TOTAL) { play("ui"); G.helpPage++; return; }
  closeHelp();
}
function closeHelp() {
  save.helpShown = true;
  writeSave();
  play("ui");
  G.mode = "countdown";
  G.countdownT = 3.0;
  G.helpPage = 0;
}

function drawHelp() {
  ctx.fillStyle = "rgba(3,8,10,0.88)";
  ctx.fillRect(0, 0, W, H);
  const e = env();
  const c = helpCard();
  roundRect(c.x, c.y, c.w, c.h, 28);
  ctx.fillStyle = "rgba(8,23,28,0.97)"; ctx.fill();
  ctx.strokeStyle = rgba(e.lane, 0.35); ctx.lineWidth = 1.6; ctx.stroke();
  // 顶部
  ctx.textAlign = "left";
  ctx.font = FONT(17);
  ctx.fillStyle = rgba(e.accent, 0.7);
  ctx.fillText("首次进入 · 操作帮助", c.x + 40, c.y + 56);
  ctx.textAlign = "right";
  ctx.fillText(`${G.helpPage + 1} / ${HELP_TOTAL}`, c.x + c.w - 40, c.y + 56);
  ctx.textAlign = "left";
  ctx.font = FONT(38, true);
  ctx.fillStyle = "rgba(240,253,255,0.97)";
  ctx.fillText(HELP_TITLES[G.helpPage], c.x + 40, c.y + 108);
  // 示意图
  const img = { x: c.x + 40, y: c.y + 136, w: c.w - 80, h: 320 };
  drawHelpImage(img, e.lane, e.accent);
  // 文字
  ctx.font = FONT(25);
  ctx.fillStyle = "rgba(206,238,246,0.92)";
  ctx.textAlign = "left";
  wrapTextLeft(HELP_BODY[G.helpPage], img.x, img.y + img.h + 46, img.w, 38);
  // 按钮
  const b = helpButton();
  const last = G.helpPage === HELP_TOTAL - 1;
  roundRect(b.x, b.y, b.w, b.h, 24);
  ctx.fillStyle = rgba(e.lane, 0.14); ctx.fill();
  ctx.strokeStyle = rgba(e.lane, 0.85); ctx.lineWidth = 2; ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(245,255,255,0.96)";
  ctx.font = FONT(29, true);
  ctx.fillText(last ? "关闭教学" : "下一页", b.x + b.w / 2, b.y + b.h / 2 + 10);
  ctx.font = FONT(13);
  ctx.fillStyle = "rgba(150,190,200,0.75)";
  ctx.fillText("点击按钮 · Enter / 空格 也可以　·　Esc 跳过", b.x + b.w / 2, b.y + b.h + 28);
  ctx.textAlign = "left";
}

// 左对齐的自动换行（wrapText 是居中版）
function wrapTextLeft(text, x, y, maxW, lineH) {
  const chars = [...text];
  let line = "", yy = y;
  for (const ch of chars) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line.length) {
      ctx.fillText(line, x, yy); line = ch; yy += lineH;
    } else line = test;
  }
  if (line) ctx.fillText(line, x, yy);
}

function drawHelpImage(r, lane, accent) {
  roundRect(r.x, r.y, r.w, r.h, 20);
  ctx.fillStyle = "rgba(4,16,20,0.9)"; ctx.fill();
  ctx.strokeStyle = rgba(lane, 0.22); ctx.lineWidth = 1.2; ctx.stroke();
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  if (G.helpPage === 0) {
    const o = { x: cx, y: cy + 44 }, h1 = { x: cx - 96, y: cy - 40 }, h2 = { x: cx + 96, y: cy - 40 };
    ctx.strokeStyle = rgba(lane, 0.8); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(h1.x, h1.y); ctx.moveTo(o.x, o.y); ctx.lineTo(h2.x, h2.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(o.x, o.y, 42, 0, TAU); ctx.fillStyle = "#8bec62"; ctx.fill();
    ctx.beginPath(); ctx.arc(h1.x, h1.y, 27, 0, TAU); ctx.fillStyle = "#ff735e"; ctx.fill();
    ctx.beginPath(); ctx.arc(h2.x, h2.y, 27, 0, TAU); ctx.fillStyle = "#ff735e"; ctx.fill();
    ctx.fillStyle = "rgba(8,26,30,0.9)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = FONT(32, true); ctx.fillText("O", o.x, o.y);
    ctx.font = FONT(24, true); ctx.fillText("H", h1.x, h1.y); ctx.fillText("H", h2.x, h2.y);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  } else if (G.helpPage === 1) {
    ctx.strokeStyle = rgba(lane, 0.45); ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, r.y + 52); ctx.lineTo(r.x + 56, r.y + r.h - 40);
    ctx.moveTo(cx, r.y + 52); ctx.lineTo(r.x + r.w - 56, r.y + r.h - 40);
    ctx.stroke();
    const ball = { x: cx, y: cy + 96 };
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 32, 0, TAU); ctx.fillStyle = "#2b3138"; ctx.fill();
    ctx.strokeStyle = "rgba(210,236,244,0.9)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 7; ctx.lineCap = "round";
    for (const s of [-1, 1]) {
      for (let k = 0; k < 2; k++) {
        const bx = cx + s * 150 - s * k * 30, by = cy + 96;
        ctx.beginPath();
        ctx.moveTo(bx - s * 18, by - 32); ctx.lineTo(bx + s * 16, by); ctx.lineTo(bx - s * 18, by + 32);
        ctx.stroke();
      }
    }
  } else if (G.helpPage === 2) {
    const ball = { x: cx, y: cy + 92 };
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 40, 0, TAU); ctx.fillStyle = "#2b3138"; ctx.fill();
    ctx.strokeStyle = "rgba(210,236,244,0.9)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy + 6, 28, 0, TAU); ctx.fillStyle = "#ff735e"; ctx.fill();
    ctx.fillStyle = "rgba(8,26,30,0.9)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = FONT(24, true); ctx.fillText("H", cx, cy + 8);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = 7;
    for (let k = 0; k < 2; k++) {
      const oy = k * 34;
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - 104 + oy); ctx.lineTo(cx, cy - 80 + oy); ctx.lineTo(cx + 24, cy - 104 + oy);
      ctx.stroke();
    }
  } else {
    const gx = cx, gy = cy + 26;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath(); ctx.arc(gx, gy, 92 * (0.62 + 0.19 * k), 0, TAU);
      ctx.strokeStyle = rgba(lane, 0.30 + 0.25 * k); ctx.lineWidth = 1.5 + k; ctx.stroke();
    }
    ctx.fillStyle = rgba(lane, 0.95); ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = FONT(34, true); ctx.fillText("H₂O", gx, gy);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    const ball = { x: cx, y: r.y + r.h - 44 };
    ctx.beginPath(); ctx.arc(ball.x, ball.y, 26, 0, TAU); ctx.fillStyle = "#2b3138"; ctx.fill();
    ctx.strokeStyle = "rgba(210,236,244,0.9)"; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = "rgba(210,250,220,0.95)";
    ctx.font = FONT(58, true); ctx.textAlign = "center";
    ctx.fillText("✓", cx, cy - 96);
    ctx.textAlign = "left";
  }
}
function drawPause() {
  ctx.fillStyle = "rgba(3,13,18,0.72)";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(235,255,255,0.96)";
  ctx.font = FONT(34, true);
  ctx.fillText("已暂停", W / 2, H * 0.42);
  ctx.font = FONT(14);
  ctx.fillStyle = "rgba(170,210,220,0.8)";
  ctx.fillText("Esc / Enter 继续　·　点任意处继续", W / 2, H * 0.42 + 40);
  const bw = 260, bh = 58, bx = (W - bw) / 2, by = H * 0.42 + 76;
  roundRect(bx, by, bw, bh, 24);
  ctx.fillStyle = "rgba(163,242,255,0.95)"; ctx.fill();
  ctx.fillStyle = "rgba(8,33,41,0.95)";
  ctx.font = FONT(19, true);
  ctx.fillText("继续", W / 2, by + bh / 2 + 6);
  ctx.textAlign = "left";
}

function drawLose() {
  const dim = 0.82;
  ctx.fillStyle = `rgba(3,13,18,${dim})`;
  ctx.fillRect(0, 0, W, H);
  const pw = 470, ph = 430;
  const px = (W - pw) / 2, py = (H - ph) / 2;
  roundRect(px, py, pw, ph, 24);
  ctx.fillStyle = "rgba(6,19,24,0.97)"; ctx.fill();
  ctx.strokeStyle = "rgba(120,239,255,0.35)"; ctx.lineWidth = 1.6; ctx.stroke();
  // 关闭按钮（右上角）
  const cbx = px + pw - 34, cby = py + 34;
  ctx.beginPath(); ctx.arc(cbx, cby, 17, 0, TAU);
  ctx.fillStyle = "rgba(255,255,255,0.06)"; ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.22)"; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = "rgba(235,255,255,0.9)";
  ctx.font = FONT(15, true);
  ctx.textAlign = "center";
  ctx.fillText("✕", cbx, cby + 5);

  ctx.textAlign = "left";
  ctx.font = FONT(11);
  ctx.fillStyle = "rgba(120,239,255,0.9)";
  ctx.fillText("STRUCTURE LOST", px + 34, py + 62);
  ctx.font = FONT(30, true);
  ctx.fillStyle = "rgba(234,252,255,0.96)";
  ctx.fillText(G.cleared ? "已通关 · 结构散架" : "结构散架", px + 34, py + 100);
  ctx.font = FONT(14);
  ctx.fillStyle = "rgba(154,196,207,0.85)";
  const best = save.best[G.level.id] || 0;
  ctx.fillText(best > 0 ? `历史最佳 ${best} 个分子` : "本次航程已结束", px + 34, py + 128);

  // 统计
  const stats = [[String(G.deliveries), "得分"], [G.runTime.toFixed(1), "存活秒数"], [String(G.hits), "撞墙"]];
  stats.forEach(([v, c], i) => {
    const cx = px + pw * (0.22 + i * 0.28);
    ctx.textAlign = "center";
    ctx.font = FONT(30, true);
    ctx.fillStyle = "rgba(234,252,255,0.96)";
    ctx.fillText(v, cx, py + 210);
    ctx.font = FONT(12);
    ctx.fillStyle = "rgba(154,196,207,0.85)";
    ctx.fillText(c, cx, py + 232);
  });
  ctx.textAlign = "center";
  // 按钮
  const bw = pw - 68;
  roundRect(px + 34, py + 262, bw, 62, 26);
  ctx.fillStyle = "rgba(163,242,255,0.95)"; ctx.fill();
  ctx.fillStyle = "rgba(8,33,41,0.95)";
  ctx.font = FONT(20, true);
  ctx.fillText("再来一次", px + pw / 2, py + 300);
  roundRect(px + 34, py + 334, bw, 46, 22);
  ctx.strokeStyle = "rgba(255,255,255,0.28)"; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.fillStyle = "rgba(234,252,255,0.9)";
  ctx.font = FONT(16, true);
  ctx.fillText("返回关卡选择", px + pw / 2, py + 363);
  ctx.font = FONT(11);
  ctx.fillStyle = "rgba(154,196,207,0.7)";
  ctx.fillText("最佳成绩仅保存在当前浏览器", px + pw / 2, py + 404);
  ctx.textAlign = "left";
}

// ───────────────────────── 输入 ─────────────────────────
function canvasPos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
}
const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

function startLevel(idx) {
  G.levelIndex = idx;
  G.level = LEVELS[idx];
  resetRun();
  G.mode = "intro";
  G.introHover = false;
  unlockAudio();
  play("ui");
  const a = audio();
  if (a && a.ready) { try { a.setTier(0); a.startMusic(); } catch (e) {} }
}
function beginCountdown() {
  if (G.mode !== "intro") return;
  unlockAudio();
  play("ui");
  // 第一次进游戏：先过 4 页操作帮助，再走 3、2、1（D-74）
  if (!save.helpShown) { beginHelp(); return; }
  G.mode = "countdown";
  G.countdownT = 3.0;
  play("tick", 3);
}
function backToMenu() {
  play("ui");
  G.mode = "menu";
  G.bigTextA = 0;
}

window.addEventListener("keydown", (ev) => {
  const k = ev.key.toLowerCase();
  unlockAudio();
  if (G.mode === "menu") {
    if (k === "arrowleft" || k === "a") { G.menuSel = (G.menuSel + LEVELS.length - 1) % LEVELS.length; ev.preventDefault(); }
    else if (k === "arrowright" || k === "d") { G.menuSel = (G.menuSel + 1) % LEVELS.length; ev.preventDefault(); }
    else if (k === "arrowup" || k === "w") { G.menuSel = (G.menuSel + LEVELS.length - 3) % LEVELS.length; ev.preventDefault(); }
    else if (k === "arrowdown" || k === "s") { G.menuSel = (G.menuSel + 3) % LEVELS.length; ev.preventDefault(); }
    else if (k === "enter" || k === " ") { if (G.menuSel + 1 <= save.unlocked) startLevel(G.menuSel); ev.preventDefault(); }
    return;
  }
  if (G.mode === "intro") {
    if (k === "enter" || k === " ") beginCountdown();
    else if (k === "escape") backToMenu();
    ev.preventDefault();
    return;
  }
  if (G.mode === "help") {
    if (k === "enter" || k === " ") { helpNext(); ev.preventDefault(); }
    else if (k === "escape") closeHelp();
    return;
  }
  if (G.mode === "pause") {
    if (k === "escape" || k === "enter" || k === " ") { G.mode = "play"; ev.preventDefault(); }
    else if (k === "m") { setMuted(!MUTED); }
    return;
  }
  if (G.mode === "lose") {
    if (k === "enter" || k === " ") { startLevel(G.levelIndex); }
    else if (k === "escape") backToMenu();
    return;
  }
  if (G.mode === "collapse") {
    if (G.collapseT > SKIP_AFTER) finishLose();
    return;
  }
  if (G.mode !== "play") return;
  if (k === "arrowleft" || k === "a") { moveLane(-1); ev.preventDefault(); }
  else if (k === "arrowright" || k === "d") { moveLane(1); ev.preventDefault(); }
  else if (k === "arrowdown" || k === "s") { requestBond(); ev.preventDefault(); }
  else if (k === "escape") { G.mode = "pause"; }
  else if (k === "m") { setMuted(!MUTED); }
});

let touchStart = null;
cv.addEventListener("pointerdown", (ev) => {
  const p = canvasPos(ev);
  touchStart = { p, t: performance.now() };
  if (G.mode === "menu") {
    for (let i = 0; i < LEVELS.length; i++) {
      if (inRect(p, cardRect(i))) {
        if (i + 1 <= save.unlocked) { unlockAudio(); G.menuSel = i; startLevel(i); }
        return;
      }
    }
    if (inRect(p, startRect()) && G.menuSel + 1 <= save.unlocked) { unlockAudio(); startLevel(G.menuSel); }
    return;
  }
  if (G.mode === "intro") {
    if (inRect(p, G.introBtn)) beginCountdown();
    return;
  }
  if (G.mode === "help") {
    if (inRect(p, helpButton())) helpNext();
    return;
  }
  if (G.mode === "pause") {
    const bw = 260, bh = 58, bx = (W - bw) / 2, by = H * 0.42 + 76;
    if (inRect(p, { x: bx, y: by, w: bw, h: bh }) || true) { G.mode = "play"; }
    return;
  }
  if (G.mode === "play") {
    // 顶部右侧两个圆钮：♪ 静音（x=W-120）/ Ⅱ 暂停（x=W-64）
    if (Math.hypot(p.x - (W - 120), p.y - 40) < 26) { unlockAudio(); setMuted(!MUTED); play("ui"); return; }
    if (Math.hypot(p.x - (W - 64), p.y - 40) < 26) { G.mode = "pause"; play("ui"); return; }
  }
  if (G.mode === "lose") {
    // 关闭按钮 & 两个按钮
    const pw = 470, ph = 430, px = (W - pw) / 2, py = (H - ph) / 2;
    if (Math.hypot(p.x - (px + pw - 34), p.y - (py + 34)) < 22) { backToMenu(); return; }
    if (inRect(p, { x: px + 34, y: py + 262, w: pw - 68, h: 62 })) { startLevel(G.levelIndex); return; }
    if (inRect(p, { x: px + 34, y: py + 334, w: pw - 68, h: 46 })) { backToMenu(); return; }
    return;
  }
  if (G.mode === "collapse") { if (G.collapseT > SKIP_AFTER) finishLose(); return; }
  // 底部三个按钮
  const btnY = H - 96 + 28;
  for (let i = 0; i < 3; i++) {
    const bx = W / 2 - 104 + i * 80 + 28;
    if (Math.hypot(p.x - bx, p.y - btnY) < 34) {
      if (i === 0) moveLane(-1); else if (i === 1) requestBond(); else moveLane(1);
      return;
    }
  }
});

cv.addEventListener("pointermove", (ev) => {
  const p = canvasPos(ev);
  if (G.mode === "intro") G.introHover = inRect(p, G.introBtn);
  if (G.mode === "menu") {
    for (let i = 0; i < LEVELS.length; i++) if (inRect(p, cardRect(i))) G.menuSel = i;
  }
});

cv.addEventListener("pointerup", (ev) => {
  if (!touchStart) return;
  const p = canvasPos(ev);
  const dx = p.x - touchStart.p.x, dy = p.y - touchStart.p.y;
  const dt = performance.now() - touchStart.t;
  touchStart = null;
  if (G.mode !== "play") return;
  if (dt < 600 && Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) moveLane(dx > 0 ? 1 : -1);
  else if (dy > 40) requestBond();
});

// ───────────────────────── 启动 ─────────────────────────
resize();
G.level = LEVELS[0];

// 内置自检：?selftest=1 —— 不依赖浏览器扩展，用 headless --dump-dom 读结果
if (new URLSearchParams(location.search).get("selftest") === "1") {
  const out = [];
  const ok = (name, cond) => out.push((cond ? "PASS " : "FAIL ") + name);
  startLevel(0);
  G.mode = "play";
  moveLane(1);
  ok("换道 中→右", G.lane === 2);
  G.entities = [{ kind: "atom", type: "atom_H", s: G.dist + 0.5, lane: G.lane, hit: false }];
  requestBond();
  checkInteractions();
  ok("下滑成键吸收 1 个", G.collected.length === 1);
  G.collected = ["atom_H", "atom_H", "atom_O"];
  ok("满链判定（多重集）", targetComplete());
  G.entities = [{ kind: "gate", s: G.dist + 0.5, lane: G.lane, hit: false }];
  checkInteractions();
  ok("撞门交付 +1", G.deliveries === 1);
  G.mode = "play";
  G.entities = [{ kind: "wall", s: G.dist + 0.5, lane: G.lane, hit: false }];
  checkInteractions();
  ok("撞墙进入 collapse", G.mode === "collapse");
  G.dist = 0; const dA = difficulty();
  G.dist = 300; const dB = difficulty();
  ok("难度爬坡 0→1", dA === 0 && dB === 1);
  ok("速度随交付提升", (() => { G.deliveries = 3; return currentSpeed() > SPEED_BASE; })());
  document.title = out.join(" | ");
  document.body.setAttribute("data-result", out.join(" | "));
  const pre = document.createElement("pre");
  pre.id = "selftest-out";
  pre.textContent = out.join("\n");
  document.body.appendChild(pre);
}

// 调试定格：?shot=intro|countdown|play|collapse|lose（仅用于截图核对）
const qs = new URLSearchParams(location.search);
const shotName = qs.get("shot");
if (shotName && shotName !== "menu") {
  const shotLevel = Math.max(1, Math.min(LEVELS.length, parseInt(qs.get("level") || "1", 10) || 1));
  startLevel(shotLevel - 1);
  const N = { intro: 0, countdown: 140, play: 40, bond: 46, collapse: 250, lose: 320 }[shotName] ?? 0;
  if (shotName !== "intro") {
    G.mode = "countdown"; G.countdownT = 3.0;
    for (let i = 0; i < 200 && G.mode === "countdown"; i++) update(1 / 60);
  }
  for (let i = 0; i < N; i++) {
    // 简易自动驾驶：保命 + 追模块
    if (G.mode === "play") {
      let danger = null;
      for (const e of G.entities) {
        if (e.kind === "wall" && !e.hit && e.lane === G.lane) {
          const rel = e.s - G.dist;
          if (rel > 0 && rel < 24) { danger = e; break; }
        }
      }
      if (danger) {
        const cand = [G.lane === 0 ? 1 : 0, 1, 2].filter((l) => l !== G.lane);
        for (const l of cand) {
          let free = true;
          for (const e of G.entities) {
            if (e.kind === "wall" && e.lane === l && Math.abs(e.s - (G.dist + 22)) < 26) free = false;
          }
          if (free) { moveLane(Math.sign(l - G.lane)); break; }
        }
      } else if (!targetComplete()) {
        let best = null, bestRel = 999;
        for (const e of G.entities) {
          if (e.kind !== "atom" || e.hit) continue;
          const rel = e.s - G.dist;
          if (rel > 4 && rel < 60 && rel < bestRel) { bestRel = rel; best = e; }
        }
        if (best && best.lane !== G.lane) {
          let safe = true;
          for (const e of G.entities) {
            if (e.kind === "wall" && e.lane === best.lane && Math.abs(e.s - (G.dist + 20)) < 26) safe = false;
          }
          if (safe) moveLane(Math.sign(best.lane - G.lane));
        }
        if (best && best.lane === G.lane && bestRel < 3.0) requestBond();
      }
    }
    update(1 / 60);
  }
  if (shotName === "bond") {
    G.entities = [{ kind: "atom", type: G.level.modules[0], s: G.dist + 1.0, lane: G.lane, hit: false }];
    requestBond();
    for (let i = 0; i < 10; i++) update(1 / 60);
  }
  if (shotName === "squash") {
    G.mode = "play";
    requestBond();
    for (let i = 0; i < 3; i++) update(1 / 60);
  }
  if (shotName === "help" || shotName === "help4") {
    G.mode = "help";
    G.helpPage = shotName === "help" ? 0 : 3;
    G.entities = [];
  }
  if (shotName === "gate") {
    // 把镜头推到第一个门前面，方便核对门色
    G.mode = "play";
    const g = G.entities.find((e) => e.kind === "gate");
    if (g) G.dist = g.s - 20;
    for (let i = 0; i < 4; i++) update(1 / 60);
  }
  if (shotName === "collapse") { beginCollapse("撞上结构墙"); for (let i = 0; i < 30; i++) update(1 / 60); }
  if (shotName === "lose") { G.deliveries = 2; G.runTime = 12.4; G.hits = 2; finishLose(); }
  if (shotName === "play") { G.lane = 1; G.laneXv = 0; G.laneVel = 0; G.camPan = 0; }
  document.body.setAttribute("data-shot", JSON.stringify({
    shot: shotName, mode: G.mode, dist: Math.round(G.dist), lane: G.lane,
    deliveries: G.deliveries, collected: G.collected.length, hits: G.hits,
    laneXv: +G.laneXv.toFixed(2), playerPx: +project(0, G.laneXv, 0.59).x.toFixed(1),
    camPan: +G.camPan.toFixed(2), camDx: +(-(G.camPan) * (F_PX / B_CAM)).toFixed(1),
    walls: G.entities.filter((e) => e.kind === "wall").map((e) => `${Math.round(e.s)}/L${e.lane}`),
  }));
}
requestAnimationFrame(frame);
})();
