import * as THREE from './three.module.min.js';

/* 碳途纪元 v2.2：巨大球面灰盒。玩法使用弧长，渲染使用真实球面。 */
const $ = id => document.getElementById(id);
const SHOT = new URLSearchParams(location.search).get('shot');
const HASH = location.hash;
const CAPTURE = Boolean(SHOT);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const R = 2800;
const LANE_W = 2.4;
const SPEED = 25;
const DRAW_AHEAD = 185;
const CAM_BACK = 14;
const CAM_HEIGHT = 6.8;
const LOOK_AHEAD = 34;
const TARGET = ['H', 'H', 'O'];
const COLORS = { H: 0xff735e, O: 0x8bec62, cyan: 0x78efff };
const HORIZON_DISTANCE = Math.sqrt(2 * R * CAM_HEIGHT + CAM_HEIGHT * CAM_HEIGHT);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 相机沿世界 +Z 前进时，屏幕左侧对应世界 +X。
const laneOffset = lane => (1 - lane) * LANE_W;

/* 本地 Tone.js：首次用户手势解锁；事件音效与四层 BGM 分总线，截图模式不创建音频节点。 */
const MUSIC_BPM = 128;
const MUSIC_ROOT = 110;
const MUSIC_CHORDS = [[0, 3, 7], [-4, 0, 5], [3, 7, 10], [-2, 2, 7]]; // Am → F → C → G
const Audio_ = {
  built: false, ready: false, master: null, loading: null, events: 0, lastSound: null,
  seq: null, musicOn: false, musicStep: 0, lastLaneAt: -99, lastLaneDirection: 0,
  lastGlide: null, lastCollapse: null,
  musicEvents: { kick: 0, snare: 0, hat: 0, bass: 0, strings: 0, arp: 0, piano: 0, gate: 0, glide: 0 },
  muted: (() => { try { return localStorage.getItem('ctjy_sphere_muted') === '1'; } catch { return false; } })(),
  load() {
    if (CAPTURE) return Promise.resolve(false);
    if (typeof Tone !== 'undefined') return Promise.resolve(true);
    if (this.loading) return this.loading;
    this.loading = new Promise(resolve => {
      const script = document.createElement('script'); script.src = './Tone.min.js';
      script.onload = () => resolve(true); script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
    return this.loading;
  },
  build() {
    if (this.built || CAPTURE || typeof Tone === 'undefined') return;
    this.master = new Tone.Gain(this.muted ? 0 : 0.72).toDestination();
    this.sfxBus = new Tone.Gain(1).connect(this.master);
    // 和声乐器需要压低，鼓组则保持原型直达输出的响度；二者共用音乐门控以便暂停与淡出。
    this.musicGate = new Tone.Gain(1).connect(this.master);
    this.musicBus = new Tone.Gain(0.35).connect(this.musicGate);
    this.drumBus = new Tone.Gain(1).connect(this.musicGate);
    this.drumAnalyser = new Tone.Analyser('waveform', 256);
    this.drumBus.connect(this.drumAnalyser);
    this.tones = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 10,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.006, decay: 0.16, sustain: 0, release: 0.14 },
      volume: -13
    }).connect(this.sfxBus);
    this.hit = new Tone.MembraneSynth({
      pitchDecay: 0.045, octaves: 4,
      envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
      volume: -11
    }).connect(this.sfxBus);
    this.collapseBass = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.6, sustain: 0, release: 0.08 },
      volume: -18
    }).connect(this.sfxBus);
    this.noisePan = new Tone.Panner(0).connect(this.sfxBus);
    this.noiseFilter = new Tone.Filter(900, 'bandpass').connect(this.noisePan);
    this.noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.004, decay: 0.14, sustain: 0, release: 0.04 },
      volume: -24
    }).connect(this.noiseFilter);

    // 鼓组不再经过 0.35 和声总线；提高 3dB 以抵消主总线 0.72 的衰减，恢复原型相对响度。
    this.kick = new Tone.MembraneSynth({
      pitchDecay: 0.05, octaves: 7,
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.10 }, volume: -5
    }).connect(this.drumBus);
    this.snareFilter = new Tone.Filter(1400, 'highpass').connect(this.drumBus);
    this.snare = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 }, volume: -15
    }).connect(this.snareFilter);
    this.hatFilter = new Tone.Filter(7000, 'highpass').connect(this.drumBus);
    this.hat = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.045, sustain: 0, release: 0.01 }, volume: -23
    }).connect(this.hatFilter);
    this.bass = new Tone.MonoSynth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.008, decay: 0.18, sustain: 0.55, release: 0.25 },
      filter: { Q: 1, type: 'lowpass' }, volume: -14
    }).connect(this.musicBus);
    this.arp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 0.16, sustain: 0, release: 0.22 }, volume: -16
    }).connect(this.musicBus);

    // 弦乐与钢琴共用程序化混响；换道滑音单独经过声像总线。
    this.reverb = new Tone.Reverb({ decay: 3.6, preDelay: 0.02, wet: 0.42 }).connect(this.musicBus);
    try { this.reverb.generate(); } catch { /* 无混响时仍可发声 */ }
    this.stringsFilter = new Tone.Filter(950, 'lowpass').connect(this.reverb);
    this.strings = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.85, decay: 0.5, sustain: 0.55, release: 2.4 }, volume: -33
    }).connect(this.stringsFilter);
    this.piano = new Tone.FMSynth({
      harmonicity: 2.5, modulationIndex: 5,
      envelope: { attack: 0.002, decay: 0.75, sustain: 0.06, release: 1.2 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.1, release: 0.6 }, volume: -21
    }).connect(this.reverb);
    // 吸附钢琴独立，避免实时 SFX 与 Transport 预调度互相回退时间。
    this.keyPiano = new Tone.FMSynth({
      harmonicity: 2.5, modulationIndex: 5,
      envelope: { attack: 0.002, decay: 0.75, sustain: 0.06, release: 1.2 },
      modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.1, release: 0.6 }, volume: -21
    }).connect(this.reverb);
    this.pianoLoud = new Tone.FMSynth({
      harmonicity: 2.5, modulationIndex: 5,
      envelope: { attack: 0.002, decay: 0.9, sustain: 0.05, release: 1.6 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.1, release: 0.7 }, volume: -9
    }).connect(this.reverb);
    // 与原型一致：glide → 950Hz 弦乐低通 → 混响；声像放在混响前，避免再经过 0.35 和声总线。
    this.glidePan = new Tone.Panner(0);
    this.glideReverb = new Tone.Reverb({ decay: 3.6, preDelay: 0.02, wet: 0.42 }).connect(this.sfxBus);
    try { this.glideReverb.generate(); } catch { /* 无混响时仍可发声 */ }
    this.glidePan.connect(this.glideReverb);
    this.glideFilter = new Tone.Filter(950, 'lowpass').connect(this.glidePan);
    this.glide = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.028, decay: 0.22, sustain: 0.22, release: 0.30 },
      filter: { type: 'lowpass', Q: 1 },
      filterEnvelope: { attack: 0.005, decay: 0.12, sustain: 0.2, release: 0.2, baseFrequency: 900, octaves: 1.8 },
      portamento: 0.16, volume: -25
    }).connect(this.glideFilter);
    this.built = true;
    this.startSequence();
  },
  chordAt(step) { return MUSIC_CHORDS[Math.floor(step / 16) % MUSIC_CHORDS.length]; },
  chordFrequency(semi, octave = 12) { return MUSIC_ROOT * Math.pow(2, (semi + octave) / 12); },
  startSequence() {
    if (this.seq || !this.built) return;
    const steps = Array.from({ length: 16 }, (_, i) => i);
    const motif = [0, 1, 2, 1, 0, 2, 1, 2];
    const kickSteps = [0, 6, 8, 11], snareSteps = [4, 12], hatSteps = [1, 3, 5, 7, 9, 11, 13, 15];
    this.seq = new Tone.Sequence((time, step) => {
      const absoluteStep = this.musicStep++;
      const chord = this.chordAt(absoluteStep);
      if (kickSteps.includes(step)) { this.kick.triggerAttackRelease('C1', '8n', time); this.musicEvents.kick++; }
      if (snareSteps.includes(step)) { this.snare.triggerAttackRelease('16n', time); this.musicEvents.snare++; }
      if (hatSteps.includes(step)) { this.hat.triggerAttackRelease('32n', time); this.musicEvents.hat++; }
      if (step === 0 || step === 8) {
        this.bass.triggerAttackRelease(this.chordFrequency(chord[0], -12), '8n', time); this.musicEvents.bass++;
        this.piano.triggerAttackRelease(this.chordFrequency(chord[step === 8 ? 1 : 0], 24), '8n', time); this.musicEvents.piano++;
      }
      if (step % 2 === 0) {
        const degree = motif[Math.floor(step / 2) % motif.length];
        const lift = Math.floor(absoluteStep / 32) % 2 === 0 ? 1 : 2;
        this.arp.triggerAttackRelease(this.chordFrequency(chord[degree], 12) * lift, '16n', time); this.musicEvents.arp++;
      }
      if (step === 0) {
        this.strings.triggerAttackRelease(chord.map(semi => this.chordFrequency(semi, 12)), '1m', time); this.musicEvents.strings++;
      }
      if (step === 14) this.arp.triggerAttackRelease(this.chordFrequency(chord[2], 24), '32n', time);
    }, steps, '16n');
    this.seq.loop = true;
    this.seq.start(0);
  },
  startMusic() {
    if (!this.ready || !this.built) return;
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = MUSIC_BPM;
    this.musicStep = 0;
    this.musicGate.gain.cancelScheduledValues(Tone.now());
    this.musicGate.gain.setTargetAtTime(1, Tone.now(), 0.04);
    Tone.Transport.start();
    this.musicOn = true;
  },
  pauseMusic() {
    if (!this.built || !this.musicOn) return;
    Tone.Transport.pause();
    this.musicGate.gain.setTargetAtTime(0, Tone.now(), 0.018);
  },
  resumeMusic() {
    if (!this.ready || !this.built) return;
    if (!this.musicOn) { this.startMusic(); return; }
    this.musicGate.gain.setTargetAtTime(1, Tone.now(), 0.035);
    Tone.Transport.start();
  },
  stopMusic(fade = 0) {
    if (!this.built) return;
    if (fade > 0) this.musicGate.gain.setTargetAtTime(0, Tone.now(), fade / 4);
    else this.musicGate.gain.setTargetAtTime(0, Tone.now(), 0.025);
    Tone.Transport.stop();
    this.musicOn = false;
  },
  async unlock() {
    if (CAPTURE) return false;
    try {
      const loaded = await this.load();
      if (!loaded || typeof Tone === 'undefined') return false;
      this.build();
      await Tone.start();
      this.ready = Tone.context.state === 'running';
      return this.ready;
    } catch { this.ready = false; return false; }
  },
  syncUI() {
    const label = this.muted ? '音乐／音效：关' : '音乐／音效：开';
    if ($('pause-mute-btn')) $('pause-mute-btn').textContent = label;
    if ($('mute-btn')) {
      $('mute-btn').textContent = this.muted ? '×' : '♪';
      $('mute-btn').setAttribute('aria-label', this.muted ? '开启音乐与音效' : '关闭音乐与音效');
    }
  },
  setMuted(value) {
    this.muted = Boolean(value);
    try { localStorage.setItem('ctjy_sphere_muted', this.muted ? '1' : '0'); } catch { /* 当前会话仍有效 */ }
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.72, Tone.now(), 0.025);
    this.syncUI();
  },
  toggle() {
    this.setMuted(!this.muted);
    if (!this.muted) this.unlock().then(ok => {
      if (!ok) return;
      this.play('ui');
      if (typeof G !== 'undefined' && G.mode === 'play') this.resumeMusic();
    });
  },
  gateArp(high = false) {
    if (!this.ready || this.muted || !this.built) return;
    this.events++; this.lastSound = 'gate'; this.musicEvents.gate++;
    const chord = this.chordAt(this.musicStep);
    const octave = high ? 24 : 12, t0 = Tone.now() + 0.02;
    chord.forEach((semi, i) => this.pianoLoud.triggerAttackRelease(this.chordFrequency(semi, octave), '8n', t0 + i * 0.13));
    this.pianoLoud.triggerAttackRelease(this.chordFrequency(chord[2], octave + 12), '4n', t0 + chord.length * 0.13 + 0.05);
  },
  play(name, detail) {
    if (!this.ready || this.muted || !this.built) return;
    const t = Tone.now() + 0.008;
    if (name === 'lane' && t - this.lastLaneAt < 0.08) return;
    if (name === 'lane') this.lastLaneAt = t;
    this.events++; this.lastSound = name;
    const note = (frequency, duration = 0.12, at = t) => this.tones.triggerAttackRelease(frequency, duration, at);
    const chord = (notes, duration, at) => this.tones.triggerAttackRelease(notes, duration, at);
    if (name === 'lane') {
      const direction = Math.sign(detail) || 1;
      this.lastLaneDirection = direction;

      // 原型 moveLane：尽量落到下一个十六分音符；等待超过 0.14s 时立即发声。
      const grid = 60 / MUSIC_BPM / 4;
      const now = Tone.now() + 0.006;
      let delay = 0;
      try {
        const transportSeconds = Tone.Transport.seconds % 1000;
        const next = Math.ceil((transportSeconds + 0.01) / grid) * grid;
        delay = Math.max(0, next - transportSeconds);
        if (delay > 0.14) delay = 0;
      } catch { delay = 0; }
      const t0 = now + delay;
      const currentChord = this.chordAt(this.musicStep);
      const fromSemi = currentChord[direction > 0 ? 0 : 2] + 12;
      const toSemi = currentChord[direction > 0 ? 2 : 0] + 24;
      const from = this.chordFrequency(fromSemi, 0);
      const to = this.chordFrequency(toSemi, 0);

      // 视听文档：横向声场 ∓0.6 → ±0.6，0.15s；原型：双段滑音 0.14s / 0.22s。
      this.glidePan.pan.setValueAtTime(-direction * 0.6, t0);
      this.glidePan.pan.linearRampToValueAtTime(direction * 0.6, t0 + 0.15);
      this.glide.triggerAttackRelease(from, 0.14, t0);
      this.glide.triggerAttackRelease(to, 0.22, t0 + 0.12);
      this.lastGlide = {
        direction, fromSemi, toSemi, from: +from.toFixed(3), to: +to.toFixed(3),
        grid: +grid.toFixed(6), delay: +delay.toFixed(6),
        durations: [0.14, 0.22], secondDelay: 0.12,
        panFrom: -direction * 0.6, panTo: direction * 0.6, panDuration: 0.15,
        filter: 950, reverbDecay: 3.6, portamento: 0.16
      };
      this.musicEvents.glide++;

      // whoosh 是独立辅助层：固定方向声像，不参与弦乐的左右扫动。
      this.noisePan.pan.setValueAtTime(direction * 0.5, t);
      this.noiseFilter.frequency.setValueAtTime(420, t);
      this.noiseFilter.frequency.exponentialRampToValueAtTime(1150, t + 0.12);
      this.noise.triggerAttackRelease(0.12, t);
    } else if (name === 'atom') {
      const currentChord = this.chordAt(this.musicStep);
      const level = Math.min(12, Math.max(0, G.collected.length - 1) * 2);
      const base = this.chordFrequency(currentChord[0], 24) * Math.pow(2, level / 12);
      this.keyPiano.triggerAttackRelease(base, '16n', t); this.musicEvents.piano++;
      note((detail === 'O' ? 244.5 : 207.7) * 4, 0.18);
      if (targetComplete()) chord(['C6', 'E6', 'G6'], 0.34, t + 0.065);
    } else if (name === 'deliver') {
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => note(n, 0.2, t + i * 0.07));
    } else if (name === 'wall') {
      this.hit.triggerAttackRelease('C2', 0.2, t); note('G2', 0.22, t + 0.015);
    } else if (name === 'collapse') {
      this.hit.triggerAttackRelease('C1', 0.65, t);
      this.collapseBass.triggerAttackRelease(70, 0.6, t);
      ['C4', 'G3', 'C3'].forEach((n, i) => note(n, 0.3, t + i * 0.12));
      this.lastCollapse = { frequency: 70, duration: 0.6, reject: [220, 207.7], musicFade: 1.5 };
    } else if (name === 'reject') {
      note(220, 0.25); note(207.7, 0.34);
    } else if (name === 'start') {
      note('C5', 0.12); note('G5', 0.22, t + 0.075);
    } else if (name === 'pause') {
      note('E5', 0.1); note('A4', 0.16, t + 0.06);
    } else if (name === 'resume') {
      note('A4', 0.1); note('E5', 0.16, t + 0.06);
    } else if (name === 'ui') note('A5', 0.055);
  },
  state() {
    const wave = this.drumAnalyser ? this.drumAnalyser.getValue() : [];
    let drumPeak = 0, drumEnergy = 0;
    for (let i = 0; i < wave.length; i++) {
      drumPeak = Math.max(drumPeak, Math.abs(wave[i])); drumEnergy += wave[i] * wave[i];
    }
    return {
      supported: typeof Tone !== 'undefined', ready: this.ready, muted: this.muted,
      events: this.events, lastSound: this.lastSound,
      context: typeof Tone !== 'undefined' && Tone.context ? Tone.context.state : 'not-created',
      music: {
        on: this.musicOn, step: this.musicStep, events: { ...this.musicEvents }, lastLaneDirection: this.lastLaneDirection,
        lastGlide: this.lastGlide ? { ...this.lastGlide } : null,
        lastCollapse: this.lastCollapse ? { ...this.lastCollapse } : null,
        transport: typeof Tone !== 'undefined' && Tone.Transport ? Tone.Transport.state : 'not-created',
        bpm: typeof Tone !== 'undefined' && Tone.Transport ? Tone.Transport.bpm.value : MUSIC_BPM,
        buses: this.built ? { harmony: 0.35, drums: 1, gate: +this.musicGate.gain.value.toFixed(3) } : null,
        levels: this.built ? { kick: -5, snare: -15, hat: -23 } : null,
        drumPeak: +drumPeak.toFixed(4), drumRms: +Math.sqrt(drumEnergy / Math.max(1, wave.length)).toFixed(4)
      }
    };
  }
};
Audio_.syncUI();

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const gameRand = mulberry32(Number(new URLSearchParams(location.search).get('seed')) || 20261110);
const visualRand = mulberry32(48151623);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: $('scene'), antialias: true, alpha: false,
    powerPreference: 'high-performance', preserveDrawingBuffer: CAPTURE
  });
} catch (error) {
  window.__showSphereError(error);
  throw error;
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030d14);
scene.fog = new THREE.FogExp2(0x071720, 0.0042);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.08, 6500);
scene.add(new THREE.HemisphereLight(0x9defff, 0x061018, 1.55));
const sun = new THREE.DirectionalLight(0xd9fbff, 2.25);
sun.position.set(-80, 140, -60);
scene.add(sun);
const rim = new THREE.DirectionalLight(0x4ba8c9, 0.8);
rim.position.set(120, -40, 90);
scene.add(rim);

/* 球面坐标：s 是沿大圆的弧长，车道偏移沿局部右手方向。 */
function surfacePoint(s, offset = 0, height = 0) {
  const a = s / R, c = Math.cos(a), sn = Math.sin(a);
  const len = Math.sqrt(R * R + offset * offset);
  const scale = (R + height) / len;
  return new THREE.Vector3(offset * scale, R * c * scale, R * sn * scale);
}
function frameAt(s) {
  const a = s / R, c = Math.cos(a), sn = Math.sin(a);
  return {
    position: new THREE.Vector3(0, R * c, R * sn),
    normal: new THREE.Vector3(0, c, sn),
    forward: new THREE.Vector3(0, -sn, c),
    right: new THREE.Vector3(1, 0, 0)
  };
}
function orientOnSphere(object, s, offset, height) {
  const f = frameAt(s);
  object.position.copy(surfacePoint(s, offset, height));
  object.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.right, f.normal, f.forward));
}

/* 球体顶点色由参数化函数生成，不依赖外部贴图。 */
const planetGeometry = new THREE.SphereGeometry(R, 128, 72);
const planetColors = [];
const p = planetGeometry.attributes.position;
const color = new THREE.Color();
for (let i = 0; i < p.count; i++) {
  const x = p.getX(i) / R, y = p.getY(i) / R, z = p.getZ(i) / R;
  const field = Math.sin(x * 31 + z * 17) * Math.sin(y * 27 - z * 13) * 0.5
    + Math.sin((x + y - z) * 67) * 0.18;
  color.setHSL(0.525 + field * 0.012, 0.43, 0.105 + field * 0.018);
  planetColors.push(color.r, color.g, color.b);
}
planetGeometry.setAttribute('color', new THREE.Float32BufferAttribute(planetColors, 3));
const planet = new THREE.Mesh(planetGeometry, new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.96, metalness: 0.04
}));
scene.add(planet);
const planetGrid = new THREE.Mesh(
  new THREE.SphereGeometry(R - 0.035, 96, 48),
  new THREE.MeshBasicMaterial({ color: 0x60c4d4, wireframe: true, transparent: true, opacity: 0.022, depthWrite: false })
);
scene.add(planetGrid);

/* 星空只参与视觉随机，不改变跑局种子。 */
const starPositions = [];
for (let i = 0; i < 950; i++) {
  const u = visualRand() * 2 - 1, theta = visualRand() * Math.PI * 2;
  const rr = 4200 + visualRand() * 800, q = Math.sqrt(1 - u * u);
  starPositions.push(rr * q * Math.cos(theta), rr * u, rr * q * Math.sin(theta));
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
  color: 0xb9e9f2, size: 2.1, transparent: true, opacity: 0.72,
  sizeAttenuation: true, depthWrite: false, fog: false
})));

function radialTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const g = cv.getContext('2d');
  const gradient = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,255,255,.65)');
  gradient.addColorStop(0.55, 'rgba(255,255,255,.13)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const glowTexture = radialTexture();
function glowSprite(hex, scale = 2) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, color: hex, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  sprite.scale.setScalar(scale);
  return sprite;
}
const labelTextures = {};
function labelTexture(type) {
  if (labelTextures[type]) return labelTextures[type];
  const cv = document.createElement('canvas'); cv.width = cv.height = 96;
  const g = cv.getContext('2d');
  g.font = '800 58px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#f4ffff'; g.fillText(type, 48, 51);
  const texture = new THREE.CanvasTexture(cv); texture.colorSpace = THREE.SRGBColorSpace;
  labelTextures[type] = texture; return texture;
}

const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
const atomMaterials = {
  H: new THREE.MeshStandardMaterial({ color: COLORS.H, emissive: 0x7e170d, emissiveIntensity: 0.65, roughness: 0.38 }),
  O: new THREE.MeshStandardMaterial({ color: COLORS.O, emissive: 0x245d13, emissiveIntensity: 0.55, roughness: 0.42 })
};
function atomObject(type, radius = 0.48, withLabel = true) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(sphereGeometry, atomMaterials[type]);
  body.scale.setScalar(radius); group.add(body);
  group.add(glowSprite(COLORS[type], radius * 3.6));
  if (withLabel) {
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(type), transparent: true, depthWrite: false }));
    label.scale.setScalar(radius * 1.15); label.position.z = radius * 0.82;
    group.add(label);
  }
  return group;
}

/* 车道是随相机前方窗口更新的球面条带，不悬浮于平面。 */
const ribbons = [];
function createRibbon(offset, halfWidth, hex, opacity, blending = THREE.NormalBlending) {
  const segments = 112;
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const indices = [];
  for (let i = 0; i < segments; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setIndex(indices);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
    color: hex, transparent: true, opacity, side: THREE.DoubleSide,
    depthWrite: false, blending
  }));
  mesh.frustumCulled = false; scene.add(mesh);
  ribbons.push({ mesh, offset, halfWidth, segments });
}
createRibbon(0, 3.72, 0x0b3440, 0.42);
createRibbon(-3.62, 0.045, COLORS.cyan, 0.72, THREE.AdditiveBlending);
createRibbon(3.62, 0.045, COLORS.cyan, 0.72, THREE.AdditiveBlending);
createRibbon(-LANE_W / 2, 0.026, COLORS.cyan, 0.36, THREE.AdditiveBlending);
createRibbon(LANE_W / 2, 0.026, COLORS.cyan, 0.36, THREE.AdditiveBlending);
function updateRibbons(dist) {
  for (const r of ribbons) {
    const array = r.mesh.geometry.attributes.position.array;
    for (let i = 0; i <= r.segments; i++) {
      const t = i / r.segments;
      const s = dist - 24 + Math.pow(t, 1.32) * (DRAW_AHEAD + 24);
      const left = surfacePoint(s, r.offset - r.halfWidth, 0.045);
      const right = surfacePoint(s, r.offset + r.halfWidth, 0.045);
      array.set([left.x, left.y, left.z, right.x, right.y, right.z], i * 6);
    }
    r.mesh.geometry.attributes.position.needsUpdate = true;
    r.mesh.geometry.computeBoundingSphere();
  }
}

const player = new THREE.Group();
const playerBody = new THREE.Mesh(sphereGeometry, new THREE.MeshStandardMaterial({
  color: 0x8299a0, emissive: 0x174b55, emissiveIntensity: 0.8,
  roughness: 0.3, metalness: 0.45
}));
playerBody.scale.setScalar(0.58); player.add(playerBody);
const playerWire = new THREE.Mesh(sphereGeometry, new THREE.MeshBasicMaterial({ color: 0xc9fbff, wireframe: true, transparent: true, opacity: 0.3 }));
playerWire.scale.setScalar(0.61); player.add(playerWire);
const playerRing = new THREE.Mesh(new THREE.TorusGeometry(0.79, 0.026, 8, 48), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.78 }));
playerRing.rotation.x = Math.PI / 2; player.add(playerRing);
player.add(glowSprite(COLORS.cyan, 2.8));
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.72, 32), new THREE.MeshBasicMaterial({ color: 0x00080c, transparent: true, opacity: 0.48, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.56; player.add(shadow);
scene.add(player);
const playerLight = new THREE.PointLight(COLORS.cyan, 3, 12, 2);
player.add(playerLight);

const trailGroup = new THREE.Group(); scene.add(trailGroup);
const trailNodes = TARGET.map(type => { const node = atomObject(type, 0.36, false); trailGroup.add(node); return node; });
const trailLineGeometry = new THREE.BufferGeometry();
trailLineGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 3), 3).setUsage(THREE.DynamicDrawUsage));
const trailLine = new THREE.Line(trailLineGeometry, new THREE.LineBasicMaterial({ color: 0xc6f8ff, transparent: true, opacity: 0.58 }));
trailLine.frustumCulled = false; scene.add(trailLine);

/* ============ 湮灭演出：共享粒子池 + 冲击环，不消耗玩法随机 ============ */
const MAX_IMPACT_PARTICLES = 180;
const impactParticles = Array.from({ length: MAX_IMPACT_PARTICLES }, () => ({
  active: false, position: new THREE.Vector3(), velocity: new THREE.Vector3(),
  normal: new THREE.Vector3(0, 1, 0), color: new THREE.Color(), life: 0, max: 1, size: 0.1
}));
const impactParticleMesh = new THREE.InstancedMesh(
  new THREE.IcosahedronGeometry(1, 0),
  new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false
  }),
  MAX_IMPACT_PARTICLES
);
impactParticleMesh.frustumCulled = false;
impactParticleMesh.visible = false;
impactParticleMesh.renderOrder = 6;
scene.add(impactParticleMesh);
const impactDummy = new THREE.Object3D();
const zeroScale = new THREE.Vector3(0, 0, 0);
const impactRingGeometry = new THREE.RingGeometry(0.9, 1, 64);
const impactRings = Array.from({ length: 12 }, () => {
  const mesh = new THREE.Mesh(impactRingGeometry, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  mesh.visible = false; mesh.renderOrder = 5; scene.add(mesh);
  return { mesh, active: false, life: 0, max: 0.34, from: 1, to: 2 };
});
const impactStats = { rings: 0, particles: 0, trailBursts: 0 };

function spawnImpactRing(position, hex, from, to, life = 0.34) {
  const ring = impactRings.find(item => !item.active);
  if (!ring) return;
  ring.active = true; ring.life = ring.max = life; ring.from = from; ring.to = to;
  ring.mesh.visible = true; ring.mesh.position.copy(position);
  // 原型的冲击环位于屏幕平面；球面版保持同样清晰可读的正向圆环。
  ring.mesh.quaternion.copy(camera.quaternion);
  ring.mesh.scale.setScalar(from);
  ring.mesh.material.color.setHex(hex); ring.mesh.material.opacity = 0.9;
  impactStats.rings++;
}
function spawnImpactBurst(position, hex, count, speedScale = 1, normal = null) {
  const frame = frameAt(G.dist);
  const up = normal ? normal.clone() : frame.normal;
  for (let i = 0; i < count; i++) {
    const particle = impactParticles.find(item => !item.active);
    if (!particle) break;
    const angle = visualRand() * Math.PI * 2;
    const speed = (2.2 + visualRand() * 7.2) * speedScale;
    particle.active = true; impactParticleMesh.visible = true;
    particle.position.copy(position); particle.normal.copy(up);
    particle.velocity.copy(frame.right).multiplyScalar(Math.cos(angle) * speed)
      .addScaledVector(frame.forward, Math.sin(angle) * speed)
      .addScaledVector(up, (1.4 + visualRand() * 4.8) * speedScale);
    particle.life = particle.max = 0.5 + visualRand() * 0.5;
    particle.size = 0.045 + visualRand() * 0.115;
    particle.color.setHex(hex);
    impactStats.particles++;
  }
}
function updateImpactFX(dt) {
  for (const ring of impactRings) {
    if (!ring.active) continue;
    ring.life -= dt;
    if (ring.life <= 0) { ring.active = false; ring.mesh.visible = false; continue; }
    const q = clamp(1 - ring.life / ring.max, 0, 1);
    const eased = 1 - Math.pow(1 - q, 3);
    ring.mesh.scale.setScalar(ring.from + (ring.to - ring.from) * eased);
    ring.mesh.material.opacity = (1 - q) * 0.9;
  }
  for (let i = 0; i < impactParticles.length; i++) {
    const particle = impactParticles[i];
    impactDummy.position.copy(particle.position);
    impactDummy.quaternion.identity();
    if (particle.active) {
      particle.life -= dt;
      if (particle.life <= 0) particle.active = false;
    }
    if (particle.active) {
      particle.velocity.addScaledVector(particle.normal, -5.5 * dt);
      particle.position.addScaledVector(particle.velocity, dt);
      impactDummy.position.copy(particle.position);
      impactDummy.scale.setScalar(particle.size * Math.pow(particle.life / particle.max, 0.7));
      impactParticleMesh.setColorAt(i, particle.color);
    } else impactDummy.scale.copy(zeroScale);
    impactDummy.updateMatrix();
    impactParticleMesh.setMatrixAt(i, impactDummy.matrix);
  }
  impactParticleMesh.visible = impactParticles.some(particle => particle.active);
  impactParticleMesh.instanceMatrix.needsUpdate = true;
  if (impactParticleMesh.instanceColor) impactParticleMesh.instanceColor.needsUpdate = true;
}
function resetImpactFX() {
  for (const ring of impactRings) { ring.active = false; ring.mesh.visible = false; }
  for (const particle of impactParticles) particle.active = false;
  impactStats.rings = impactStats.particles = impactStats.trailBursts = 0;
  updateImpactFX(0);
  if ($('impact-flash')) $('impact-flash').style.opacity = '0';
}
const playerFadeMaterials = [];
player.traverse(object => {
  if (!object.material) return;
  object.material.transparent = true;
  object.material.userData.baseOpacity = object.material.opacity;
  playerFadeMaterials.push(object.material);
});
function setPlayerVanish(value) {
  const q = clamp(value, 0, 1);
  player.visible = q < 1;
  player.scale.setScalar(Math.max(0.001, (1 + q * 0.55) * (1 - q)));
  for (const material of playerFadeMaterials) material.opacity = material.userData.baseOpacity * (1 - q);
}

/* ============ 世界物件 ============ */
const wallGeometry = new THREE.BoxGeometry(1.78, 2.2, 0.34);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x9de8f2, emissive: 0x1b6f7c, emissiveIntensity: 0.8, transparent: true, opacity: 0.74, roughness: 0.3 });
const wallWireMaterial = new THREE.MeshBasicMaterial({ color: 0xe2fdff, wireframe: true, transparent: true, opacity: 0.72 });
const pillarGeometry = new THREE.CylinderGeometry(0.045, 0.18, 8, 10, 1, true);
const pillarMaterial = new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const tickGeometry = new THREE.BoxGeometry(7.1, 0.025, 0.06);
const tickMaterial = new THREE.MeshBasicMaterial({ color: 0x8defff, transparent: true, opacity: 0.2, depthWrite: false });
const propGeometry = new THREE.OctahedronGeometry(0.55, 0);
const propMaterial = new THREE.MeshStandardMaterial({ color: 0x1d5964, emissive: 0x0c3038, emissiveIntensity: 0.4, roughness: 0.72 });

function makeAtom(type, s, lane) {
  const group = atomObject(type);
  scene.add(group);
  return { kind: 'atom', type, s, lane, group, hit: false, phase: gameRand() * Math.PI * 2 };
}
function makeWall(s, lane) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(wallGeometry, wallMaterial));
  const wire = new THREE.Mesh(wallGeometry, wallWireMaterial); wire.scale.setScalar(1.035); group.add(wire);
  const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial); pillar.position.y = 3.6; group.add(pillar);
  group.add(glowSprite(COLORS.cyan, 3.5));
  scene.add(group);
  return { kind: 'wall', s, lane, group, hit: false };
}
function makeGate(s, lane) {
  const group = new THREE.Group();
  const ringMaterial = new THREE.MeshStandardMaterial({ color: COLORS.cyan, emissive: 0x247e8c, emissiveIntensity: 1.1, roughness: 0.28, metalness: 0.35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.095, 10, 64), ringMaterial);
  ring.position.y = 1.62; group.add(ring);
  const postGeometry = new THREE.BoxGeometry(0.11, 1.68, 0.13);
  for (const side of [-1, 1]) {
    const post = new THREE.Mesh(postGeometry, ringMaterial); post.position.set(side * 1.52, 0.82, 0); group.add(post);
  }
  const molecule = new THREE.Group();
  const h1 = atomObject('H', 0.23, false), h2 = atomObject('H', 0.23, false), o = atomObject('O', 0.31, false);
  h1.position.set(-0.55, -0.14, 0); h2.position.set(0.55, -0.14, 0); o.position.set(0, 0.38, 0);
  molecule.add(h1, h2, o); molecule.position.set(0, 1.62, 0); group.add(molecule);
  const beacon = new THREE.Mesh(pillarGeometry, pillarMaterial); beacon.position.y = 4.8; beacon.scale.set(1.4, 1.3, 1.4); group.add(beacon);
  group.add(glowSprite(COLORS.cyan, 5.2));
  scene.add(group);
  return { kind: 'gate', s, lane, group, ring, molecule, hit: false };
}
function makeTick(s) {
  const group = new THREE.Group(); group.add(new THREE.Mesh(tickGeometry, tickMaterial)); scene.add(group);
  return { kind: 'tick', s, lane: 1, group };
}
function makeProp(s, offset) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(propGeometry, propMaterial);
  const scale = 0.6 + gameRand() * 1.4; mesh.scale.set(scale, scale * (1.3 + gameRand()), scale);
  mesh.position.y = scale * 0.45; group.add(mesh); scene.add(group);
  return { kind: 'prop', s, offset, lane: 1, group };
}

let entities = [];
function removeEntity(entity) {
  scene.remove(entity.group);
  entity.removed = true;
}
function clearEntities() {
  for (const entity of entities) removeEntity(entity);
  entities = [];
}
function safeLaneNear(s, preferred) {
  const candidates = [preferred, 0, 1, 2].filter((v, i, a) => a.indexOf(v) === i);
  for (const lane of candidates) {
    const blocked = entities.some(e => (e.kind === 'wall' || e.kind === 'gate') && e.lane === lane && Math.abs(e.s - s) < 18);
    if (!blocked) return lane;
  }
  return preferred;
}
function spawnAhead() {
  while (G.nextTick < G.dist + DRAW_AHEAD) { entities.push(makeTick(G.nextTick)); G.nextTick += 7; }
  while (G.nextProp < G.dist + DRAW_AHEAD) {
    const side = gameRand() < 0.5 ? -1 : 1;
    entities.push(makeProp(G.nextProp, side * (6.8 + gameRand() * 5.5))); G.nextProp += 13 + gameRand() * 9;
  }
  while (G.nextAtom < G.dist + DRAW_AHEAD) {
    const type = TARGET[G.atomIndex % TARGET.length];
    const lane = safeLaneNear(G.nextAtom, Math.floor(gameRand() * 3));
    entities.push(makeAtom(type, G.nextAtom, lane));
    G.atomIndex++; G.nextAtom += 11 + gameRand() * 6;
  }
  while (G.nextWall < G.dist + DRAW_AHEAD) {
    const lane = safeLaneNear(G.nextWall, Math.floor(gameRand() * 3));
    entities.push(makeWall(G.nextWall, lane)); G.nextWall += 30 + gameRand() * 12;
  }
  while (G.nextGate < G.dist + DRAW_AHEAD) {
    const lane = safeLaneNear(G.nextGate, Math.floor(gameRand() * 3));
    entities.push(makeGate(G.nextGate, lane)); G.nextGate += 82;
  }
}

/* ============ 跑局状态与判定 ============ */
function loadBest() {
  try { return JSON.parse(localStorage.getItem('ctjy_sphere_best') || '{}'); } catch { return {}; }
}
const G = {
  mode: 'title', dist: 0, time: 0, lane: 1, laneX: 0, score: 0, deliveries: 0,
  hits: 0, gateFails: 0, collected: [], bot: false, botTimer: 0, collapse: 0,
  hitstop: 0, flash: 0, shake: 0, camKick: 0,
  nextTick: 0, nextProp: 8, nextAtom: 15, nextWall: 47, nextGate: 82, atomIndex: 0,
  absorbSlots: new Set(), trailPulse: [-99, -99, -99], trailSprings: [null, null, null],
  toastTimer: 0, uiTimer: 0, best: loadBest().score || 0
};
function targetComplete() {
  return G.collected.length === 3 && G.collected.filter(x => x === 'H').length === 2 && G.collected.includes('O');
}
function typeNeeded(type) {
  const max = type === 'H' ? 2 : 1;
  return G.collected.filter(x => x === type).length < max;
}
function flushAbsorptions() {
  for (const e of entities) if (e.absorbing) removeEntity(e);
  for (const slot of G.absorbSlots) G.trailSprings[slot] = null;
  G.absorbSlots.clear();
}
function showToast(text, tint = '#eafcff') {
  $('toast').textContent = text; $('toast').style.color = tint; $('toast').classList.add('show');
  G.toastTimer = 1.15;
}
function moveLane(direction) {
  if (G.mode !== 'play') return;
  const next = clamp(G.lane + direction, 0, 2);
  if (next !== G.lane) { G.lane = next; Audio_.play('lane', direction); }
}
function setOverlay(id) {
  for (const name of ['title', 'pause', 'lose']) $(name).classList.toggle('hidden', name !== id);
  $('hud').classList.toggle('hidden', id === 'title');
}
function resetRun(bot = false) {
  clearEntities();
  Object.assign(G, {
    mode: 'play', dist: 0, time: 0, lane: 1, laneX: 0, score: 0, deliveries: 0,
    hits: 0, gateFails: 0, collected: [], bot, botTimer: 0, collapse: 0,
    hitstop: 0, flash: 0, shake: 0, camKick: 0,
    nextTick: 0, nextProp: 8, nextAtom: 15, nextWall: 47, nextGate: 82, atomIndex: 0,
    absorbSlots: new Set(), trailPulse: [-99, -99, -99], trailSprings: [null, null, null],
    toastTimer: 0, uiTimer: 0
  });
  resetImpactFX(); setPlayerVanish(0); setOverlay(null); spawnAhead(); updateHUD();
}
function startGame(bot = false) { resetRun(bot); }
function userStart(bot = false) {
  Audio_.unlock().then(ok => {
    if (!ok) return;
    Audio_.play('start');
    Audio_.startMusic();
  });
  startGame(bot);
}
function togglePause() {
  if (G.mode === 'play') {
    G.mode = 'pause'; setOverlay('pause'); Audio_.play('pause'); Audio_.pauseMusic();
  } else if (G.mode === 'pause') {
    G.mode = 'play'; setOverlay(null); Audio_.play('resume'); Audio_.resumeMusic();
  }
}
function finishLose() {
  G.mode = 'lose'; setPlayerVanish(1);
  G.hitstop = 0; G.flash = 0; G.shake = 0; G.camKick = 0; resetImpactFX();
  const isBest = G.score > G.best;
  if (isBest) {
    G.best = G.score;
    try { localStorage.setItem('ctjy_sphere_best', JSON.stringify({ score: G.best, time: G.time })); } catch { /* 无痕模式仍可游玩 */ }
  }
  $('final-score').textContent = G.score;
  $('final-distance').textContent = G.time.toFixed(1);
  $('final-hits').textContent = G.hits;
  $('best-line').textContent = isBest ? `新纪录 · 最佳 ${G.best} 个分子` : `历史最佳 ${G.best} 个分子`;
  setOverlay('lose');
}
function hitWall(entity) {
  flushAbsorptions(); entity.hit = true; G.hits++;
  if (G.collected.length) {
    const lost = G.collected.pop(); G.trailPulse[G.collected.length] = -99; G.trailSprings[G.collected.length] = null;
    showToast(`${lost} 脱离结构`, '#bdefff'); Audio_.play('wall');
  } else beginCollapse();
}
function beginCollapse() {
  if (G.mode === 'collapse' || G.mode === 'lose') return;
  G.mode = 'collapse'; G.collapse = 0;
  G.flash = Math.max(G.flash, 0.9); G.shake = Math.max(G.shake, 18);
  G.hitstop = Math.max(G.hitstop, 0.12); if (!REDUCED) G.camKick -= 0.18;
  showToast('结构湮灭', '#ffffff');

  const frame = frameAt(G.dist);
  const origin = player.position.clone().addScaledVector(frame.normal, 0.18);
  for (let i = 0; i < 3; i++) {
    spawnImpactRing(origin, i === 0 ? 0xffffff : COLORS.cyan, 0.65 + i * 0.48, 3.2 + i * 1.05);
  }
  // 单次爆发不超过 40；核心总碎屑与拖尾爆散合计仍低于 200 同屏预算。
  spawnImpactBurst(origin, 0xffffff, 40, 1.15, frame.normal);
  spawnImpactBurst(origin, COLORS.cyan, 36, 1, frame.normal);
  spawnImpactBurst(origin, COLORS.cyan, 26, 0.76, frame.normal);

  const count = Math.min(G.collected.length, trailNodes.length);
  for (let i = 0; i < count; i++) {
    const node = trailNodes[i];
    const position = node.visible ? node.position.clone() : trailTarget(i);
    const type = G.collected[i];
    spawnImpactBurst(position, COLORS[type], 12, 0.72, frame.normal);
    spawnImpactRing(position, 0xffffff, 0.35, 1.45, 0.34);
    node.visible = false; impactStats.trailBursts++;
  }
  G.collected = []; G.trailSprings = [null, null, null]; G.absorbSlots.clear();
  trailLineGeometry.setDrawRange(0, 0); updateHUD();
  Audio_.play('reject'); Audio_.play('collapse'); Audio_.stopMusic(1.5);
}
function judgeGate(entity) {
  flushAbsorptions(); entity.hit = true;
  if (targetComplete()) {
    G.score++; G.deliveries++; G.collected = []; G.trailPulse = [-99, -99, -99]; G.trailSprings = [null, null, null];
    showToast('H₂O 交付', '#a9f8ff'); Audio_.play('deliver');
  } else {
    G.gateFails++;
    if (G.collected.length) { G.collected.pop(); G.trailPulse[G.collected.length] = -99; G.trailSprings[G.collected.length] = null; }
    showToast('结构不符', '#c4d9de'); Audio_.play('reject');
  }
}
function updateGateCue() {
  for (const e of entities) {
    if (e.kind !== 'gate' || e.hit || e.gateCue) continue;
    const rel = e.s - G.dist;
    if (rel > 0 && rel < 30) {
      e.gateCue = true;
      Audio_.gateArp(targetComplete());
    }
  }
}
function checkInteractions() {
  for (const e of entities) {
    if (e.hit || e.removed) continue;
    const rel = e.s - G.dist;
    if (rel < -1.2 || rel > 1.15 || e.lane !== G.lane) continue;
    if (e.kind === 'atom' && typeNeeded(e.type)) {
      e.hit = true; e.absorbing = 0.0001; e.absorbSlot = G.collected.length;
      e.absorbStart = e.group.position.clone(); G.absorbSlots.add(e.absorbSlot);
      G.collected.push(e.type); Audio_.play('atom', e.type);
      showToast(targetComplete() ? 'H₂O 已成键 · 找门' : `${e.type} 吸附`, e.type === 'H' ? '#ffb3a6' : '#cfffba');
    } else if (e.kind === 'wall') hitWall(e);
    else if (e.kind === 'gate') judgeGate(e);
    if (G.mode !== 'play') break;
  }
}
function safeLanesAt(s, range = 18) {
  return [0, 1, 2].filter(lane => !entities.some(e => !e.hit && e.kind === 'wall' && e.lane === lane && e.s - G.dist > -2 && e.s - G.dist < range && Math.abs(e.s - s) < range));
}
function botStep(dt) {
  G.botTimer -= dt; if (G.botTimer > 0) return; G.botTimer = 0.1;
  const currentDanger = entities.some(e => !e.hit && e.kind === 'wall' && e.lane === G.lane && e.s - G.dist > 0 && e.s - G.dist < 23);
  if (currentDanger) {
    const safe = safeLanesAt(G.dist + 12, 24);
    if (!safe.includes(G.lane) && safe.length) G.lane = safe.reduce((a, b) => Math.abs(b - G.lane) < Math.abs(a - G.lane) ? b : a, safe[0]);
    return;
  }
  const gate = entities.filter(e => !e.hit && e.kind === 'gate' && e.s > G.dist).sort((a, b) => a.s - b.s)[0];
  if (gate && gate.s - G.dist < 58) {
    if (targetComplete()) { G.lane = gate.lane; return; }
    if (gate.s - G.dist < 20 && G.lane === gate.lane) {
      const alternatives = [0, 1, 2].filter(l => l !== gate.lane && safeLanesAt(G.dist + 8, 18).includes(l));
      if (alternatives.length) G.lane = alternatives[0];
    }
  }
  const atom = entities.filter(e => !e.hit && !e.removed && e.kind === 'atom' && typeNeeded(e.type) && e.s > G.dist + 2 && e.s - G.dist < 48 && safeLanesAt(e.s, 14).includes(e.lane)).sort((a, b) => a.s - b.s)[0];
  if (atom) G.lane = atom.lane;
}
function remainingAtoms() {
  const h = G.collected.filter(type => type === 'H').length;
  const o = G.collected.filter(type => type === 'O').length;
  return Math.max(0, 2 - h) + Math.max(0, 1 - o);
}
function updateHUD() {
  $('score').textContent = G.score; $('distance').textContent = Math.floor(G.dist); $('hits').textContent = G.hits;
  const slots = document.querySelectorAll('.slot');
  slots.forEach((slot, i) => {
    const type = TARGET[i];
    const occurrence = TARGET.slice(0, i).filter(targetType => targetType === type).length;
    const filled = G.collected.filter(collectedType => collectedType === type).length > occurrence;
    slot.classList.toggle('filled', filled); slot.textContent = type;
    slot.classList.toggle('h', type === 'H'); slot.classList.toggle('o', type === 'O');
  });
  $('status').textContent = targetComplete() ? '结构正确 · 寻找分子门' : `还需 ${remainingAtoms()} 个原子`;
}

/* ============ 视觉同步与主循环 ============ */
function syncEntities(dt) {
  for (const e of entities) {
    if (e.removed) continue;
    const rel = e.s - G.dist;
    if (e.kind === 'atom' && e.absorbing) {
      e.absorbing += G.mode === 'play' ? dt : 0;
      const t = clamp(e.absorbing / 0.26, 0, 1), q = t * t * (3 - 2 * t);
      const end = trailTarget(e.absorbSlot);
      e.group.position.lerpVectors(e.absorbStart, end, q);
      e.group.position.addScaledVector(frameAt(G.dist).normal, Math.sin(Math.PI * t) * 0.72);
      e.group.scale.setScalar(1 - q * 0.72); e.group.visible = true;
      if (t >= 1) {
        G.absorbSlots.delete(e.absorbSlot); G.trailPulse[e.absorbSlot] = G.time;
        G.trailSprings[e.absorbSlot] = { position: end.clone(), velocity: new THREE.Vector3() };
        removeEntity(e);
      }
      continue;
    }
    if (rel < -14) { removeEntity(e); continue; }
    // 拉远相机后，已通过的高大物件不能夹在相机与玩家之间遮挡画面。
    const behindPlayer = e.kind !== 'tick' && rel < -2.5;
    e.group.visible = !behindPlayer && rel < DRAW_AHEAD + 15;
    if (!e.group.visible) continue;
    if (e.kind === 'atom') {
      const bob = REDUCED ? 0 : Math.sin(G.time * 3.2 + e.phase) * 0.1;
      orientOnSphere(e.group, e.s, laneOffset(e.lane), 0.88 + bob);
      e.group.visible = !e.hit;
    } else if (e.kind === 'wall') {
      orientOnSphere(e.group, e.s, laneOffset(e.lane), 1.12);
    } else if (e.kind === 'gate') {
      orientOnSphere(e.group, e.s, laneOffset(e.lane), 0.02);
      const ready = targetComplete();
      e.ring.material.color.setHex(ready ? 0xb7ffcf : COLORS.cyan);
      e.ring.material.emissive.setHex(ready ? 0x3b9c59 : 0x247e8c);
      if (!REDUCED) e.molecule.rotation.z = Math.sin(G.time * 1.7 + e.s) * 0.08;
    } else if (e.kind === 'tick') {
      orientOnSphere(e.group, e.s, 0, 0.065);
    } else if (e.kind === 'prop') {
      orientOnSphere(e.group, e.s, e.offset, 0.02);
    }
  }
  entities = entities.filter(e => !e.removed);
}
// 保留原型的高度、正弦相位和弹簧参数；后一节改追前一节实际位置，形成逐节换道惯性。
function trailSway(index) {
  return REDUCED ? 0 : Math.sin((index + 1) * 0.95 + G.time * 0.6) * 0.52;
}
function trailTarget(index, previousPosition = null) {
  const frame = frameAt(G.dist);
  if (index > 0 && previousPosition) {
    // 稳态时与原型目标完全重合；换道时位移沿链逐节传递，而非三节同步追主角。
    return previousPosition.clone()
      .addScaledVector(frame.normal, 0.82)
      .addScaledVector(frame.right, trailSway(index) - trailSway(index - 1));
  }
  return surfacePoint(G.dist, G.laneX, 1.48 + index * 0.82)
    .addScaledVector(frame.right, trailSway(index));
}
function syncTrail(dt) {
  const points = [player.position.clone().addScaledVector(frameAt(G.dist).normal, 0.32)];
  let previousPosition = null;
  for (let i = 0; i < trailNodes.length; i++) {
    const node = trailNodes[i], visible = i < G.collected.length && player.visible && !G.absorbSlots.has(i);
    node.visible = visible;
    if (visible) {
      const target = trailTarget(i, previousPosition);
      let spring = G.trailSprings[i];
      if (!spring) spring = G.trailSprings[i] = { position: target.clone(), velocity: new THREE.Vector3() };
      if (REDUCED || G.mode !== 'play') {
        if (REDUCED) spring.position.copy(target);
        spring.velocity.set(0, 0, 0);
      } else {
        // 与原型 updateTrail 一致：stiff=170，阻尼每 60fps 帧乘 0.86。
        spring.velocity.addScaledVector(target.clone().sub(spring.position), 170 * dt);
        spring.velocity.multiplyScalar(Math.pow(0.86, dt * 60));
        spring.position.addScaledVector(spring.velocity, dt);
      }
      node.position.copy(spring.position);
      previousPosition = node.position;
      const pulse = clamp(1 - (G.time - G.trailPulse[i]) / 0.24, 0, 1);
      node.scale.setScalar(1 + Math.sin(pulse * Math.PI) * 0.28);
      points.push(node.position.clone());
    }
  }
  const attribute = trailLineGeometry.attributes.position;
  points.forEach((point, i) => attribute.setXYZ(i, point.x, point.y, point.z));
  attribute.needsUpdate = true; trailLineGeometry.setDrawRange(0, G.collected.length ? points.length : 0);
}
function syncCameraAndPlayer(dt) {
  orientOnSphere(player, G.dist, G.laneX, 0.59);
  if (!REDUCED && G.mode === 'play') {
    playerBody.rotation.y += dt * 0.7;
    playerRing.rotation.z += dt * 0.45;
  }
  syncTrail(dt);
  const kick = REDUCED ? 0 : G.camKick;
  const cameraFrame = frameAt(G.dist - CAM_BACK - kick * 5.5);
  camera.position.copy(surfacePoint(G.dist - CAM_BACK - kick * 5.5, G.laneX * 0.18, CAM_HEIGHT));
  camera.up.copy(cameraFrame.normal);
  camera.lookAt(surfacePoint(G.dist + LOOK_AHEAD, G.laneX * 0.08, 1.1));
  if (!REDUCED && G.shake > 0) {
    const amount = G.shake * 0.018;
    camera.position.addScaledVector(cameraFrame.right, (visualRand() - 0.5) * amount);
    camera.position.addScaledVector(cameraFrame.normal, (visualRand() - 0.5) * amount);
  }
}
function update(dt) {
  // 原型先冻结世界，再播放散架；闪白与相机反馈仍在 renderFrame 中衰减。
  if ((G.mode === 'play' || G.mode === 'collapse') && G.hitstop > 0) {
    G.hitstop = Math.max(0, G.hitstop - dt);
    return;
  }
  if (G.mode === 'play') {
    if (G.bot) botStep(dt);
    G.time += dt; G.dist += SPEED * dt;
    G.laneX += (laneOffset(G.lane) - G.laneX) * (1 - Math.exp(-dt * 12));
    spawnAhead(); updateGateCue(); checkInteractions();
    G.uiTimer -= dt; if (G.uiTimer <= 0) { G.uiTimer = 0.1; updateHUD(); }
  } else if (G.mode === 'collapse') {
    G.collapse += dt;
    setPlayerVanish(G.collapse / 0.35);
    updateImpactFX(dt);
    G.camKick += (0 - G.camKick) * (1 - Math.exp(-dt * 5));
    if (G.collapse >= 1.55) finishLose();
  } else if (G.mode === 'title') {
    G.dist += dt * 1.4;
  }
  if (G.toastTimer > 0) {
    G.toastTimer -= dt;
    if (G.toastTimer <= 0) $('toast').classList.remove('show');
  }
}
let ribbonFrame = 0;
function renderFrame(dt = 0) {
  if (dt > 0) {
    G.flash = Math.max(0, G.flash - dt * 2.6);
    G.shake = Math.max(0, G.shake * Math.exp(-dt * 9));
  }
  $('impact-flash').style.opacity = (G.flash * 0.42).toFixed(3);
  if ((ribbonFrame++ % 3) === 0 || CAPTURE) updateRibbons(G.dist);
  syncEntities(dt); syncCameraAndPlayer(dt); renderer.render(scene, camera);
}

let pointerStart = null;
$('scene').addEventListener('pointerdown', event => {
  pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  $('scene').setPointerCapture(event.pointerId);
});
$('scene').addEventListener('pointerup', event => {
  if (!pointerStart || pointerStart.id !== event.pointerId) return;
  const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
  if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.15) moveLane(dx > 0 ? 1 : -1);
  pointerStart = null;
});
$('scene').addEventListener('pointercancel', () => { pointerStart = null; });
$('start-btn').addEventListener('click', () => userStart(false));
$('pause-btn').addEventListener('click', togglePause);
$('resume-btn').addEventListener('click', togglePause);
$('mute-btn').addEventListener('click', () => Audio_.toggle());
$('pause-mute-btn').addEventListener('click', () => Audio_.toggle());
$('pause-restart-btn').addEventListener('click', () => userStart(false));
$('restart-btn').addEventListener('click', () => userStart(false));
$('left-btn').addEventListener('pointerdown', event => { event.preventDefault(); moveLane(-1); });
$('right-btn').addEventListener('pointerdown', event => { event.preventDefault(); moveLane(1); });
window.addEventListener('keydown', event => {
  if (event.repeat && !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  if (event.key.toLowerCase() === 'm') Audio_.toggle();
  else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') moveLane(-1);
  else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') moveLane(1);
  else if (event.key === 'Escape' || event.key.toLowerCase() === 'p') togglePause();
  else if (event.key.toLowerCase() === 'r') userStart(G.bot);
  else if (event.key === ' ' && (G.mode === 'title' || G.mode === 'lose')) userStart(false);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G.mode === 'play') togglePause(); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75)); renderer.setSize(innerWidth, innerHeight, false);
  if (CAPTURE) renderFrame(0);
});

window.__gameProbe = function () {
  const upcomingGate = entities.filter(e => e.kind === 'gate' && !e.hit && e.s >= G.dist).sort((a, b) => a.s - b.s)[0];
  return {
    version: 'v2.2-sphere', mode: G.mode, radius: R, horizon: +HORIZON_DISTANCE.toFixed(1),
    time: +G.time.toFixed(2), distance: +G.dist.toFixed(2), lane: G.lane,
    laneX: +G.laneX.toFixed(2), playerVisible: player.visible, playerScale: +player.scale.x.toFixed(3),
    playerScreenX: +((player.position.clone().project(camera).x + 1) / 2).toFixed(3),
    playerScreenY: +((1 - player.position.clone().project(camera).y) / 2).toFixed(3),
    score: G.score, deliveries: G.deliveries, remainingAtoms: remainingAtoms(),
    wallHits: G.hits, gateFails: G.gateFails, collected: G.collected.join(''),
    absorbing: G.absorbSlots.size, audio: Audio_.state(),
    collapse: +G.collapse.toFixed(3), hitstop: +G.hitstop.toFixed(3),
    flash: +G.flash.toFixed(3), shake: +G.shake.toFixed(3), camKick: +G.camKick.toFixed(3),
    effects: {
      rings: impactRings.filter(ring => ring.active).length,
      particles: impactParticles.filter(particle => particle.active).length,
      spawnedRings: impactStats.rings, spawnedParticles: impactStats.particles,
      trailBursts: impactStats.trailBursts,
      ringScales: impactRings.filter(ring => ring.active).map(ring => +ring.mesh.scale.x.toFixed(3))
    },
    trail: trailNodes.filter(node => node.visible).map(node => ({
      heightAbovePlayer: +node.position.clone().sub(player.position).dot(frameAt(G.dist).normal).toFixed(3),
      lateralFromPlayer: +node.position.clone().sub(player.position).dot(frameAt(G.dist).right).toFixed(3),
      screenX: +((node.position.clone().project(camera).x + 1) / 2).toFixed(3),
      screenY: +((1 - node.position.clone().project(camera).y) / 2).toFixed(3)
    })),
    atoms: entities.filter(e => e.kind === 'atom').length,
    walls: entities.filter(e => e.kind === 'wall').length,
    gates: entities.filter(e => e.kind === 'gate').length,
    nextGateDistance: upcomingGate ? +(upcomingGate.s - G.dist).toFixed(2) : null,
    drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    best: G.best, bot: G.bot
  };
};
window.__sphereSelfTest = function () {
  const checks = [];
  function check(name, pass, detail) { checks.push({ name, pass: Boolean(pass), detail }); }
  let radiusOK = true, frameOK = true, arcOK = true;
  for (const s of [-3000, 0, 137, 5000]) {
    for (const lane of [-LANE_W, 0, LANE_W]) {
      const point = surfacePoint(s, lane, 0.6);
      radiusOK = radiusOK && Math.abs(point.length() - (R + 0.6)) < 0.0001;
    }
    const f = frameAt(s);
    frameOK = frameOK && Math.abs(f.normal.dot(f.forward)) < 1e-10 && Math.abs(f.normal.length() - 1) < 1e-10;
    arcOK = arcOK && Math.abs(surfacePoint(s).distanceTo(surfacePoint(s + 1)) - 1) < 0.0001;
  }
  check('所有车道点严格位于球面', radiusOK);
  check('相机切线与球面法线正交', frameOK);
  check('逻辑弧长与球面弦长近似一致', arcOK);
  check('当前门生成距离位于地平线内', HORIZON_DISTANCE > 82, +HORIZON_DISTANCE.toFixed(1));
  check('三车道偏移保持对称', laneOffset(0) === -laneOffset(2) && laneOffset(1) === 0);
  check('逻辑左右车道与屏幕方向一致', laneOffset(0) > 0 && laneOffset(2) < 0);
  return { version: 'v2.2-sphere', pass: checks.every(c => c.pass), checks, errors: [] };
};

/* 截图模式从启动即停止连续渲染；目标帧绘制后才发出就绪信号。 */
function prepareCapture(name) {
  if (name === 'play') {
    resetRun(true);
    for (let i = 0; i < 720; i++) { update(1 / 60); syncEntities(1 / 60); syncTrail(1 / 60); }
  } else if (name === 'absorb') {
    resetRun(false); clearEntities();
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    entities.push(makeAtom('H', 8, 1));
    for (let i = 0; i < 22; i++) { update(1 / 60); syncEntities(1 / 60); syncTrail(1 / 60); }
    updateHUD();
  } else if (name === 'wall') {
    resetRun(false); clearEntities();
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    entities.push(makeAtom('H', 8, 1)); entities.push(makeWall(16, 1));
    for (let i = 0; i < 50; i++) { update(1 / 60); syncEntities(1 / 60); syncTrail(1 / 60); }
    updateHUD();
  } else if (name === 'gate') {
    resetRun(false); clearEntities();
    G.dist = 50; G.time = 12; G.collected = ['H', 'H', 'O']; G.lane = 1; G.laneX = 0;
    G.nextTick = G.nextProp = G.nextAtom = G.nextWall = G.nextGate = 10000;
    for (let s = 42; s < 210; s += 7) entities.push(makeTick(s));
    for (let s = 55; s < 200; s += 19) entities.push(makeProp(s, (s % 38 ? -1 : 1) * 8.5));
    entities.push(makeGate(G.dist + 15, 1));
    entities.push(makeWall(G.dist + 48, 0));
    entities.push(makeAtom('H', G.dist + 38, 2));
    updateHUD();
  } else if (name === 'collapse') {
    resetRun(false); clearEntities();
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    G.collected = ['H', 'H', 'O'];
    for (let s = -14; s < 190; s += 7) entities.push(makeTick(s));
    syncCameraAndPlayer(0); updateHUD(); beginCollapse();
    G.hitstop = 0;
    for (let i = 0; i < 12; i++) { update(1 / 60); renderFrame(1 / 60); }
  } else if (name === 'lose') {
    resetRun(false);
    G.score = 2; G.deliveries = 2; G.time = 37.4; G.hits = 3;
    finishLose();
  }
  renderFrame(0);
}

spawnAhead(); updateRibbons(G.dist); syncCameraAndPlayer(0);
if (CAPTURE) {
  prepareCapture(SHOT);
  $('boot').classList.add('done');
  requestAnimationFrame(() => {
    renderFrame(0);
    window.__GAME_READY__ = true;
    window.__CAPTURE_READY__ = true;
  });
} else {
  if (HASH.includes('demo') || HASH.includes('test')) startGame(true);
  else if (HASH.includes('absorb')) {
    startGame(false); clearEntities();
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    entities.push(makeAtom('H', 8, 1)); spawnAhead(); updateHUD();
  }
  else if (HASH.includes('trail')) {
    startGame(false); clearEntities();
    G.collected = ['H', 'H', 'O']; G.nextAtom = G.nextWall = G.nextGate = 10000;
    spawnAhead(); updateHUD();
  }
  else if (HASH.includes('endlosefull')) {
    startGame(false); clearEntities();
    G.collected = ['H', 'H', 'O'];
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    for (const s of [16, 24, 32, 40]) entities.push(makeWall(s, 1));
    spawnAhead(); updateHUD();
  }
  else if (HASH.includes('endlose')) {
    startGame(false); clearEntities();
    G.nextTick = 0; G.nextProp = 8; G.nextAtom = G.nextWall = G.nextGate = 10000;
    entities.push(makeWall(16, 1)); spawnAhead(); updateHUD();
  } else setOverlay('title');
  let previous = performance.now(), first = true;
  const frameSamples = [];
  function loop(now) {
    const dt = Math.min(0.05, Math.max(0, (now - previous) / 1000)); previous = now;
    update(dt); renderFrame(dt);
    frameSamples.push(dt); if (frameSamples.length > 120) frameSamples.shift();
    window.__averageFps = frameSamples.length / Math.max(0.001, frameSamples.reduce((a, b) => a + b, 0));
    if (first) {
      first = false; $('boot').classList.add('done');
      window.__GAME_READY__ = true;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}
