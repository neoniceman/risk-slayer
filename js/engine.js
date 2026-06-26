/* =========================================================================
 *  Insurance Heroes : Risk Slayer
 *  engine.js  —  저수준 엔진 (포맷 / 저장 / 오디오 / 햅틱 / 풀 / RNG / 수학)
 *  전역 네임스페이스 G 에 부착. file:// 에서도 동작하도록 모듈 미사용.
 * ========================================================================= */
window.G = window.G || {};

/* ------------------------------------------------------------------ *
 *  큰 숫자 포맷 (1.23K, 4.56M, 7.89aa ...)  — 클리커 필수
 * ------------------------------------------------------------------ */
G.fmt = (function () {
  const SUFFIX = ['', 'K', 'M', 'B', 'T'];
  // T 이후 두 글자 접미사 aa, ab, ... zz
  function bigSuffix(tier) {
    tier -= SUFFIX.length; // 0 == aa
    const first = Math.floor(tier / 26);
    const second = tier % 26;
    return String.fromCharCode(97 + first) + String.fromCharCode(97 + second);
  }
  function num(v) {
    if (!isFinite(v)) return '∞';
    if (v < 1000) return (v < 10 && v % 1 !== 0) ? v.toFixed(1) : Math.floor(v).toString();
    const tier = Math.floor(Math.log10(v) / 3);
    const scaled = v / Math.pow(10, tier * 3);
    const suf = tier < SUFFIX.length ? SUFFIX[tier] : bigSuffix(tier);
    return (scaled < 100 ? scaled.toFixed(2) : scaled.toFixed(1)) + suf;
  }
  function int(v) { return Math.floor(v).toLocaleString('en-US'); }
  function time(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return `${h}시간 ${m}분`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
  }
  function clock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return { num, int, time, clock };
})();

/* ------------------------------------------------------------------ *
 *  결정적/난수 유틸
 * ------------------------------------------------------------------ */
G.rng = {
  range: (a, b) => a + Math.random() * (b - a),
  int: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: (arr) => arr[(Math.random() * arr.length) | 0],
  chance: (p) => Math.random() < p,
  // 가중치 선택: [{w:weight, ...}] 또는 weightFn
  weighted(arr, wfn) {
    let total = 0;
    for (const it of arr) total += wfn ? wfn(it) : it.w;
    let r = Math.random() * total;
    for (const it of arr) { r -= wfn ? wfn(it) : it.w; if (r <= 0) return it; }
    return arr[arr.length - 1];
  }
};

/* ------------------------------------------------------------------ *
 *  로컬 저장 (LocalStorage, 디바운스 자동저장)
 * ------------------------------------------------------------------ */
G.storage = (function () {
  const KEY = 'risk_slayer_save_v1';
  let timer = null;
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('save failed', e); }
  }
  function load() {
    try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    catch (e) { return null; }
  }
  function queueSave(getState, delay = 1500) {
    if (timer) return;
    timer = setTimeout(() => { timer = null; save(getState()); }, delay);
  }
  function wipe() { localStorage.removeItem(KEY); }
  return { save, load, queueSave, wipe };
})();

/* ------------------------------------------------------------------ *
 *  WebAudio 합성 효과음 — 로딩 없이 즉각 반응하는 손맛
 * ------------------------------------------------------------------ */
G.audio = (function () {
  let ctx = null, master = null;
  let enabled = true;
  let volume = 0.6;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function setEnabled(v) { enabled = v; }
  function setVolume(v) { volume = v; if (master) master.gain.value = v; }

  function tone(freq, dur, type = 'sine', gain = 0.3, slide = 0) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, gain = 0.3, hp = 800) {
    if (!enabled || !ctx) return;
    const t = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain(); g.gain.value = gain;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }

  // 사운드 사전
  const SFX = {
    hit() { tone(G.rng.range(420, 520), 0.08, 'square', 0.18, -120); noise(0.05, 0.12, 1200); },
    crit() { tone(880, 0.12, 'sawtooth', 0.3, -300); noise(0.12, 0.25, 600); tone(1320, 0.1, 'square', 0.18); },
    kill() { tone(200, 0.25, 'sawtooth', 0.3, 260); noise(0.22, 0.3, 300); },
    boss() { tone(110, 0.6, 'sawtooth', 0.35, 30); tone(74, 0.6, 'square', 0.25, 10); },
    bossKill() { [0, 80, 160, 240].forEach((d, i) => setTimeout(() => tone(330 + i * 110, 0.3, 'sawtooth', 0.3, 120), d)); noise(0.4, 0.35, 200); },
    coin() { tone(1180, 0.06, 'square', 0.12, 200); setTimeout(() => tone(1560, 0.06, 'square', 0.1, 200), 40); },
    level() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.22), i * 70)); },
    skill() { tone(180, 0.3, 'sawtooth', 0.3, 900); noise(0.25, 0.2, 500); },
    upgrade() { tone(660, 0.1, 'triangle', 0.22); setTimeout(() => tone(990, 0.12, 'triangle', 0.22), 70); },
    box() { [392, 523, 659, 784, 988].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'triangle', 0.2), i * 60)); },
    error() { tone(160, 0.15, 'square', 0.18, -40); },
    tab() { tone(620, 0.04, 'triangle', 0.12); },
    reward() { [659, 784, 988, 1318].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.22), i * 80)); }
  };
  function play(name) { ensure(); resume(); if (SFX[name]) SFX[name](); }

  return { play, ensure, resume, setEnabled, setVolume, get enabled() { return enabled; } };
})();

/* ------------------------------------------------------------------ *
 *  햅틱(진동) — Android Chrome
 * ------------------------------------------------------------------ */
G.haptic = (function () {
  let enabled = true;
  const has = 'vibrate' in navigator;
  function setEnabled(v) { enabled = v; }
  function buzz(pattern) { if (enabled && has) try { navigator.vibrate(pattern); } catch (e) {} }
  return {
    setEnabled,
    light() { buzz(8); },
    medium() { buzz(18); },
    heavy() { buzz([0, 30, 20, 40]); },
    crit() { buzz([0, 15, 10, 25]); },
    level() { buzz([0, 20, 30, 20, 30, 40]); },
    boss() { buzz([0, 60, 40, 80]); }
  };
})();

/* ------------------------------------------------------------------ *
 *  오브젝트 풀 — 이펙트 GC 최소화
 * ------------------------------------------------------------------ */
G.Pool = function (factory, reset) {
  const free = [];
  const active = [];
  return {
    active,
    obtain() {
      const o = free.pop() || factory();
      active.push(o);
      return o;
    },
    release(o) {
      const i = active.indexOf(o);
      if (i >= 0) active.splice(i, 1);
      if (reset) reset(o);
      free.push(o);
    },
    // 역순 순회하며 dead 처리
    update(dt, isDead, onDead) {
      for (let i = active.length - 1; i >= 0; i--) {
        const o = active[i];
        if (isDead(o, dt)) {
          active.splice(i, 1);
          if (onDead) onDead(o);
          if (reset) reset(o);
          free.push(o);
        }
      }
    }
  };
};

/* ------------------------------------------------------------------ *
 *  보간/이징 헬퍼
 * ------------------------------------------------------------------ */
G.math = {
  clamp: (v, a, b) => v < a ? a : v > b ? b : v,
  lerp: (a, b, t) => a + (b - a) * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeIn: (t) => t * t * t,
  easeOutBack: (t) => { const c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
};
