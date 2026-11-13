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

  const BPM = 84;
  const SPB = 60 / BPM;             // 秒 / 拍
  const LOOKAHEAD = 0.5;            // 提前排 0.5s
  const TICK_MS = 90;

  // A 小调五声，够用且不刺耳
  const CHORDS = [
    [110.0, 164.81, 220.0],   // Am  (A2 E3 A3)
    [87.31, 130.81, 174.61],  // F   (F2 C3 F3)
    [130.81, 196.0, 261.63],  // C   (C3 G3 C4)
    [98.0, 146.83, 196.0],    // G   (G2 D3 G3)
  ];
  const PENTA = [440.0, 523.25, 587.33, 659.25, 783.99];  // A4 C5 D5 E5 G5

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
    // pad：两个失谐锯齿过低通，整小节缓慢起落
    chord.forEach((f, i) => {
      if (i > 1 && tier < 1) return;             // 低档留根音+五度，升档再叠八度
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const lp = ctx.createBiquadFilter();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = det;
        lp.type = "lowpass";
        lp.frequency.value = 620 + i * 220;
        lp.Q.value = 0.7;
        const peak = (i === 0 ? 0.115 : 0.060) * (tier >= 1 ? 1.0 : 0.9);
        g.gain.setValueAtTime(0.0001, barStart);
        g.gain.linearRampToValueAtTime(peak, barStart + SPB * 1.4);
        g.gain.linearRampToValueAtTime(0.0001, barStart + SPB * 4.0);
        o.connect(lp); lp.connect(g); g.connect(musicBus);
        o.start(barStart); o.stop(barStart + SPB * 4.05);
      }
    });
    // 低音：根音低八度长音，托住整小节
    {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lp = ctx.createBiquadFilter();
      o.type = "sine";
      o.frequency.value = chord[0] * 0.5;
      lp.type = "lowpass"; lp.frequency.value = 220;
      g.gain.setValueAtTime(0.0001, barStart);
      g.gain.linearRampToValueAtTime(0.16, barStart + SPB * 0.5);
      g.gain.linearRampToValueAtTime(0.0001, barStart + SPB * 3.6);
      o.connect(lp); lp.connect(g); g.connect(musicBus);
      o.start(barStart); o.stop(barStart + SPB * 3.7);
    }
    // kick：1、3 拍
    for (const b of [0, 2]) {
      const t = barStart + b * SPB;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(46, t + 0.16);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 + tier * 0.04, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      o.connect(g); g.connect(musicBus);
      o.start(t); o.stop(t + 0.22);
    }
    // hat：八分音符
    for (let i = 0; i < 8; i++) {
      const t = barStart + i * SPB * 0.5;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf; src.loop = true;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 7200;
      const g = ctx.createGain();
      const peak = (i % 2 === 0 ? 0.030 : 0.020) + tier * 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
      src.connect(hp); hp.connect(g); g.connect(musicBus);
      src.start(t); src.stop(t + 0.06);
    }
    // 高档：五声音阶点缀
    if (tier >= 1) {
      for (const b of [1.5, 3.0]) {
        const f = PENTA[Math.floor(hash01(beat + b) * PENTA.length)];
        const t = barStart + b * SPB;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(g); g.connect(musicBus);
        o.start(t); o.stop(t + 0.58);
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
