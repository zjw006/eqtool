/* 碳途纪元 · 网页版程序化音频（D-61）
 * 全部用 Web Audio 合成，不加载任何音频文件：
 *   - 音效：打击三层（低频 thump / 中频 crack / 高频 swish）+ 成键/交付/湮灭/UI
 *   - 背景音：84 BPM 的和弦 pad + 心跳 kick + 沙锤，随交付次数升档
 * 浏览器策略：AudioContext 必须在用户手势后创建/恢复，所以 init() 由点击/按键触发。
 */
(() => {
"use strict";

const GameAudio = (() => {
  let ctx = null, master = null, comp = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false;
  let musicOn = false, tier = 0, schedTimer = null, nextBeatAt = 0, beat = 0;

  // 对齐 godot/audio/bgm/bgm_normal.wav 的实测特征：≈140 BPM、F# 调（F#/B/A/C# 最突出）
  const BPM = 140;
  const SPB = 60 / BPM;             // 秒 / 拍（≈0.429s）
  const LOOKAHEAD = 0.5;            // 提前排 0.5s
  const TICK_MS = 90;

  // A 小调五声，够用且不刺耳
  // F# 小调：i - iv - VI - III（F#m - Bm - D - A），和采样曲的色度谱一致
  // 8 小节循环（第二遍把最后一小节换成 E，做个小转折）：i - iv - VI - III | i - iv - VI - VII
  const CHORDS = [
    [92.50, 138.59, 185.00],   // F#m (F#2 C#3 F#3)
    [123.47, 185.00, 246.94],  // Bm  (B2 F#3 B3)
    [146.83, 220.00, 293.66],  // D   (D3 A3 D4)
    [110.00, 164.81, 220.00],  // A   (A2 E3 A3)
    [92.50, 138.59, 185.00],   // F#m
    [123.47, 185.00, 246.94],  // Bm
    [146.83, 220.00, 293.66],  // D
    [82.41, 123.47, 164.81],   // E   (E2 B2 E3) 转折
  ];
  const PENTA = [369.99, 440.0, 493.88, 554.37, 659.25];  // F#4 A4 B4 C#5 E5

  function init() {
    if (ctx) { if (ctx.state === "suspended") ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 24; comp.ratio.value = 3.2;
    comp.attack.value = 0.004; comp.release.value = 0.24;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.85;
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.95;
    musicBus = ctx.createGain(); musicBus.gain.value = 0.0;
    sfxBus.connect(master); musicBus.connect(master);
    master.connect(comp); comp.connect(ctx.destination);
    // 1 秒白噪声，复用
    const n = Math.floor(ctx.sampleRate);
    noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function now() { return ctx ? ctx.currentTime : 0; }

  // ───────── 基础积木 ─────────
  function tone(bus, t0, dur, type, f0, f1, peak, attack = 0.004) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(bus, t0, dur, type, freq, q, peak, sweepTo) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.setValueAtTime(freq, t0);
    f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(60, sweepTo), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  // ───────── 音效 ─────────
  function ui() {
    if (!ctx) return;
    const t = now();
    tone(sfxBus, t, 0.05, "square", 880, 660, 0.08);
  }

  // 成键：音高随链长上升
  function bond(index = 0) {
    if (!ctx) return;
    const t = now();
    const base = 392.0 * Math.pow(2, (index * 2) / 12);
    tone(sfxBus, t, 0.20, "triangle", base, base * 1.5, 0.20);
    tone(sfxBus, t, 0.16, "sine", base / 2, base / 2, 0.16);
    noise(sfxBus, t, 0.06, "bandpass", 3200, 2.0, 0.05, 5200);
  }

  // 满链：小三和弦分解
  function full() {
    if (!ctx) return;
    const t = now();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      tone(sfxBus, t + i * 0.055, 0.34, "triangle", f, f, 0.16);
    });
    noise(sfxBus, t, 0.18, "highpass", 4200, 1.2, 0.05, 9000);
  }

  // 交付：上行分解 + whoosh
  function deliver() {
    if (!ctx) return;
    const t = now();
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      tone(sfxBus, t + i * 0.07, 0.42, "sine", f, f * 1.01, 0.18);
      tone(sfxBus, t + i * 0.07, 0.30, "triangle", f * 2, f * 2, 0.05);
    });
    noise(sfxBus, t + 0.02, 0.34, "bandpass", 700, 1.1, 0.10, 5200);
  }

  // 撞碎 / 撞墙：低频 thump + 中频 crack + 高频 swish
  function impact(kind = "wall") {
    if (!ctx) return;
    const t = now();
    const heavy = kind === "wall";
    tone(sfxBus, t, heavy ? 0.42 : 0.16, "sine", heavy ? 150 : 220, heavy ? 42 : 90, heavy ? 0.42 : 0.20);
    noise(sfxBus, t, heavy ? 0.30 : 0.10, "bandpass", heavy ? 900 : 2200, 1.4, heavy ? 0.26 : 0.14, heavy ? 180 : 700);
    noise(sfxBus, t, 0.22, "highpass", 3600, 0.9, heavy ? 0.14 : 0.07, 8000);
  }

  function shatter() { impact("atom"); }

  // 过关
  function clear() {
    if (!ctx) return;
    const t = now();
    const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => tone(sfxBus, t + i * 0.09, 0.5, "triangle", f, f, 0.16));
  }

  function tick(digit = 3) {
    if (!ctx) return;
    const t = now();
    tone(sfxBus, t, 0.09, "sine", 520 + (3 - digit) * 120, 520 + (3 - digit) * 120, 0.14);
  }

  // ───────── 背景音 ─────────
  function scheduleBar(t0) {
    const chord = CHORDS[Math.floor(beat / 4) % CHORDS.length];
    const barStart = t0;
    // ── pad：失谐锯齿，低通随档位打开 ──
    chord.forEach((f, i) => {
      if (i > 1 && tier < 1) return;
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        o.type = "sawtooth";
        o.frequency.value = f * 2.0;                 // 抬高八度，F#2 太糊
        o.detune.value = det;
        lp.type = "lowpass";
        lp.frequency.value = 1500 + i * 500 + tier * 600;
        lp.Q.value = 0.9;
        const peak = (i === 0 ? 0.085 : 0.048) * (tier >= 1 ? 1.0 : 0.85);
        g.gain.setValueAtTime(0.0001, barStart);
        g.gain.linearRampToValueAtTime(peak, barStart + SPB * 0.35);
        g.gain.linearRampToValueAtTime(0.0001, barStart + SPB * 4.0);
        o.connect(lp); lp.connect(g); g.connect(musicBus);
        o.start(barStart); o.stop(barStart + SPB * 4.05);
      }
    });
    // 后半段（第 5 小节起）叠一层高八度微光，避免 4 小节循环听起来太死
    if (Math.floor(beat / 4) % 8 >= 4) {
      const f2 = chord[2] * 4.0;
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      const lp2 = ctx.createBiquadFilter();
      o2.type = "triangle";
      o2.frequency.value = f2;
      lp2.type = "lowpass"; lp2.frequency.value = 4200;
      g2.gain.setValueAtTime(0.0001, barStart);
      g2.gain.linearRampToValueAtTime(0.022, barStart + SPB * 0.5);
      g2.gain.linearRampToValueAtTime(0.0001, barStart + SPB * 3.8);
      o2.connect(lp2); lp2.connect(g2); g2.connect(musicBus);
      o2.start(barStart); o2.stop(barStart + SPB * 4.0);
    }
    // ── 低音：八分音符跳根音（模仿采样曲的驱动感）──
    for (let i = 0; i < 8; i++) {
      const tt = barStart + i * SPB * 0.5;
      const f = i % 4 === 3 ? chord[1] * 0.5 : chord[0] * 0.5;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      o.type = "triangle";
      o.frequency.value = f;
      lp.type = "lowpass"; lp.frequency.value = 420;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.13, tt + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.20);
      o.connect(lp); lp.connect(g); g.connect(musicBus);
      o.start(tt); o.stop(tt + 0.22);
    }
    // ── kick：四拍全踩（140 BPM 的舞曲感）──
    for (let b = 0; b < 4; b++) {
      const tt = barStart + b * SPB;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(150, tt);
      o.frequency.exponentialRampToValueAtTime(46, tt + 0.12);
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.20 + tier * 0.03, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.17);
      o.connect(g); g.connect(musicBus);
      o.start(tt); o.stop(tt + 0.19);
    }
    // ── snare：2、4 拍（带通噪声）──
    for (const b of [1, 3]) {
      const tt = barStart + b * SPB;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1900; bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(0.085 + tier * 0.01, tt + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.12);
      src.connect(bp); bp.connect(g); g.connect(musicBus);
      src.start(tt); src.stop(tt + 0.14);
    }
    // ── 沙锤：十六分音符，反拍更亮 ──
    for (let i = 0; i < 16; i++) {
      const tt = barStart + i * SPB * 0.25;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 8200;
      const g = ctx.createGain();
      const peak = (i % 4 === 2 ? 0.030 : i % 2 === 0 ? 0.020 : 0.013) + tier * 0.004;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(peak, tt + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.035);
      src.connect(hp); hp.connect(g); g.connect(musicBus);
      src.start(tt); src.stop(tt + 0.05);
    }
    // ── 一档以上：十六分琶音，按五声音阶在每小节换型 ──
    if (tier >= 1) {
      for (let i = 0; i < 8; i++) {
        const tt = barStart + i * SPB * 0.5;
        const f = PENTA[(Math.floor(hash01(beat + i * 1.7) * PENTA.length)) % PENTA.length];
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.exponentialRampToValueAtTime(0.045, tt + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
        o.connect(g); g.connect(musicBus);
        o.start(tt); o.stop(tt + 0.24);
      }
    }
  }
  function hash01(v) { return Math.abs(Math.sin(v * 12.9898) * 43758.5453) % 1; }

  function scheduler() {
    if (!ctx || !musicOn) return;
    const ahead = now() + LOOKAHEAD;
    while (nextBeatAt < ahead) {
      scheduleBar(nextBeatAt);
      nextBeatAt += SPB * 4;   // 一小节
      beat += 4;
    }
  }

  function startMusic() {
    init();
    if (!ctx || musicOn) return;
    musicOn = true;
    nextBeatAt = now() + 0.12;
    beat = 0;
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setValueAtTime(musicBus.gain.value, now());
    musicBus.gain.linearRampToValueAtTime(0.80, now() + 1.6);
    scheduler();
    schedTimer = setInterval(scheduler, TICK_MS);
  }

  function stopMusic(fade = 0.8) {
    if (!ctx || !musicOn) return;
    musicOn = false;
    if (schedTimer) { clearInterval(schedTimer); schedTimer = null; }
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setValueAtTime(musicBus.gain.value, now());
    musicBus.gain.linearRampToValueAtTime(0.0001, now() + fade);
  }

  function setTier(n) { tier = Math.max(0, Math.min(2, n | 0)); }

  function setMuted(m) {
    muted = !!m;
    if (!ctx) return;
    const t = now();
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(muted ? 0.0001 : 0.85, t + 0.12);
  }
  const isMuted = () => muted;

  return { init, ui, bond, full, deliver, impact, shatter, clear, tick, startMusic, stopMusic, setTier, setMuted, isMuted,
           get ready() { return !!ctx; } };
})();

window.GameAudio = GameAudio;
})();
