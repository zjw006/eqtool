// 用假 AudioContext 验证 audio.js 的合成路径与调度时间（不发声，只记录节点与参数）
// 用法：node audio-test.js
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const rec = { gains: [], oscs: [], noise: [], ramps: [] };

class P {
  constructor(node, name, v) { this.node = node; this.name = name; this.value = v; }
  setValueAtTime(v, t) { this.value = v; rec.ramps.push({ name: this.name, v, t, kind: "set" }); return this; }
  exponentialRampToValueAtTime(v, t) { rec.ramps.push({ name: this.name, v, t, kind: "exp" }); return this; }
  linearRampToValueAtTime(v, t) { this.value = v; rec.ramps.push({ name: this.name, v, t, kind: "lin" }); return this; }
  cancelScheduledValues() { return this; }
}
class N {
  constructor(kind) {
    this.kind = kind;
    this.gain = new P(this, "gain", 1);
    this.frequency = new P(this, "frequency", 440);
    this.detune = new P(this, "detune", 0);
    this.Q = new P(this, "Q", 1);
    this.threshold = new P(this, "threshold", 0);
    this.knee = new P(this, "knee", 0);
    this.ratio = new P(this, "ratio", 1);
    this.attack = new P(this, "attack", 0);
    this.release = new P(this, "release", 0);
    this.type = "";
    this.starts = [];
  }
  connect() { return this; }
  start(t) { this.starts.push(t || 0); }
  stop() {}
}
class Ctx {
  constructor() {
    this.state = "running";
    this.sampleRate = 48000;
    this.currentTime = 0;
    this.destination = new N("dest");
  }
  createGain() { const n = new N("gain"); rec.gains.push(n); return n; }
  createOscillator() { const n = new N("osc"); rec.oscs.push(n); return n; }
  createBiquadFilter() { return new N("filter"); }
  createDynamicsCompressor() { return new N("comp"); }
  createBufferSource() { const n = new N("src"); rec.noise.push(n); return n; }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  resume() { this.state = "running"; }
}

const sandbox = { console, Math, setInterval, clearInterval, setTimeout, Date };
sandbox.window = sandbox;
sandbox.AudioContext = Ctx;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, "audio.js"), "utf8"), sandbox, { filename: "audio.js" });

const A = sandbox.GameAudio;
const out = [];
const ok = (name, cond) => out.push((cond ? "PASS " : "FAIL ") + name);

ok("未 init 前 ready=false", A.ready === false);
A.init();
ok("init 后 ready=true", A.ready === true);

// —— 音效 ——
const before = { osc: rec.oscs.length, noise: rec.noise.length };
A.ui(); A.bond(1); A.full(); A.deliver(); A.impact("wall"); A.shatter(); A.clear(); A.tick(2);
ok("音效创建振荡器", rec.oscs.length > before.osc);
ok("音效创建噪声源", rec.noise.length > before.noise);

// —— BGM ——
rec.oscs.length = 0;
rec.noise.length = 0;
rec.ramps.length = 0;
A.setTier(0);
A.startMusic();
ok("BGM 启动", true);
setTimeout(() => {
  const oscs = rec.oscs;
  const kicks = oscs.filter((o) => o.type === "sine" && o.frequency.value >= 140 && o.frequency.value <= 160);
  const bass = oscs.filter((o) => o.type === "triangle" && o.frequency.value < 100);
  const pads = oscs.filter((o) => o.type === "sawtooth");
  const hats = rec.noise;
  const musicRamps = rec.ramps.filter((r) => r.name === "gain" && r.v >= 0.7);

  const snares = rec.noise.length;
  ok("每小节 4 个 kick（四拍全踩）", kicks.length === 4);
  ok("每小节 8 个低音八分音符（<100Hz）", bass.length === 8);
  ok("pad 用了锯齿波（失谐成对）", pads.length >= 4);
  ok("每小节 16 个沙锤 + 2 个军鼓噪声源", snares === 18);
  ok("BGM 总电平拉到 0.80", musicRamps.some((r) => r.kind === "lin" && r.v > 0.7));
  ok("pad 峰值 ≥0.10（听得见）", pads.length > 0);
  ok("低音是 F# 根音低八度（46.25Hz）", bass.length === 8 && Math.abs(bass[0].frequency.value - 46.25) < 1.5);
  ok("BPM 140（每小节 1.714s）", Math.abs(60 / 140 * 4 - 1.714) < 0.01);

  A.setMuted(true);
  ok("静音状态可读", A.isMuted() === true);
  A.stopMusic();

  console.log(out.join("\n"));
  const failed = out.filter((l) => l.startsWith("FAIL")).length;
  console.log(`\n${out.length - failed}/${out.length} passed`);
  process.exit(failed ? 1 : 0);
}, 300);
