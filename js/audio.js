// Procedural music + sound effects via Web Audio — no audio files needed.
// Medieval palette: Karplus–Strong plucked lute/harp, bagpipe-style drone,
// horn calls, and hand-drum thumps. Everything no-ops until the first user
// gesture creates the AudioContext (browser autoplay rule) and when running
// headless in test/smoke.js.
// M key or the 🔊 touch button toggles mute (persisted in localStorage).

var AC = null, sfxBus = null, musicBus = null;
var muted = typeof localStorage !== 'undefined' && localStorage.getItem('cq-muted') === '1';

function audioInit() {
  if (typeof window === 'undefined') return;
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  AC = new Ctor();
  sfxBus = AC.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(AC.destination);
  musicBus = AC.createGain(); musicBus.gain.value = 0.4; musicBus.connect(AC.destination);
  nextStep = AC.currentTime + 0.1;
  setInterval(musicTick, 80);
}
addEventListener('pointerdown', audioInit);
addEventListener('keydown', audioInit);
addEventListener('keydown', e => { if (e.key === 'm' || e.key === 'M') toggleMute(); });

function toggleMute() {
  muted = !muted;
  if (typeof localStorage !== 'undefined') localStorage.setItem('cq-muted', muted ? '1' : '0');
  const b = document.getElementById('bM'); if (b) b.textContent = muted ? '🔇' : '🔊';
}
(() => { const b = document.getElementById('bM'); if (b) { b.textContent = muted ? '🔇' : '🔊'; b.addEventListener('click', () => { audioInit(); toggleMute(); }); } })();

// ---- synthesis primitives ----
const at = off => AC ? AC.currentTime + off : 0;
function _o(dest, freq, dur, type, vol, slide, when) {
  if (!AC || muted) return;
  const t0 = when || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
}
var noiseBuf = null;
function _n(dest, dur, vol, freq, when) {
  if (!AC || muted) return;
  if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = when || AC.currentTime, s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1;
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t0); s.stop(t0 + dur + 0.02);
}
const tone = (f, dur, type, vol, slide, when) => _o(sfxBus, f, dur, type, vol, slide, when);
const hiss = (dur, vol, freq, when) => _n(sfxBus, dur, vol, freq, when);

// Plucked string (lute/harp) via Karplus–Strong, rendered once per pitch
// into a cached buffer: a burst of noise fed through a decaying average.
var pluckCache = {};
function pluckBuf(freq) {
  const key = Math.round(freq);
  if (pluckCache[key]) return pluckCache[key];
  const sr = AC.sampleRate, N = Math.max(2, Math.round(sr / freq)), len = Math.floor(sr * 0.9);
  const buf = AC.createBuffer(1, len, sr), d = buf.getChannelData(0);
  for (let i = 0; i < N; i++) d[i] = Math.random() * 2 - 1;
  for (let i = N + 1; i < len; i++) d[i] = 0.996 * 0.5 * (d[i - N] + d[i - N - 1]);
  pluckCache[key] = buf; return buf;
}
function pluck(dest, freq, vol, when) {
  if (!AC || muted) return;
  const t0 = when || AC.currentTime, s = AC.createBufferSource(), g = AC.createGain();
  s.buffer = pluckBuf(freq); g.gain.value = vol;
  s.connect(g); g.connect(dest); s.start(t0); s.stop(t0 + 0.9);
}
// Horn: sawtooth through a lowpass with a breathy attack and release.
function horn(dest, freq, dur, vol, when) {
  if (!AC || muted) return;
  const t0 = when || AC.currentTime, o = AC.createOscillator(), f = AC.createBiquadFilter(), g = AC.createGain();
  o.type = 'sawtooth'; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = freq * 4;
  g.gain.setValueAtTime(0.001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.06);
  g.gain.setValueAtTime(vol, t0 + Math.max(0.07, dur - 0.08)); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(f); f.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.02);
}
// Bell: a fundamental plus inharmonic partials, like a small chapel bell.
function bell(dest, freq, vol, when) {
  [[1, 1], [2.76, 0.4], [5.4, 0.15]].forEach(([m, a]) => _o(dest, freq * m, 0.6, 'sine', vol * a, null, when));
}
// Hand drum: pitch-dropping sine thud with a skin-slap of noise.
function thump(dest, vol, when) {
  if (!AC || muted) return;
  const t0 = when || AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(140, t0); o.frequency.exponentialRampToValueAtTime(45, t0 + 0.18);
  g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
  o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.22);
  _n(dest, 0.05, vol * 0.4, 200, when);
}

// ---- sound effects (call these from gameplay code) ----
const sfx = {
  swing:   () => hiss(0.09, 0.12, 2400),
  chop:    () => { hiss(0.08, 0.28, 600); tone(85, 0.09, 'triangle', 0.15, 55); },
  mine:    () => { hiss(0.04, 0.2, 2600); bell(sfxBus, 1320, 0.05); },
  hit:     () => { hiss(0.07, 0.2, 1400); tone(760, 0.09, 'square', 0.05, 500); },
  kill:    () => [294, 349, 440].forEach((f, i) => pluck(sfxBus, f, 0.25, at(i * 0.06))),
  pickup:  () => { pluck(sfxBus, 587, 0.22); pluck(sfxBus, 880, 0.22, at(0.07)); },
  hurt:    () => { thump(sfxBus, 0.3); tone(170, 0.18, 'triangle', 0.15, 80); },
  build:   () => { hiss(0.09, 0.25, 450); bell(sfxBus, 523, 0.12, at(0.1)); },
  deny:    () => { thump(sfxBus, 0.2); thump(sfxBus, 0.2, at(0.14)); },
  arrow:   () => hiss(0.12, 0.08, 4000),
  teleport:() => { hiss(0.25, 0.15, 3500); [587, 880, 1175].forEach((f, i) => pluck(sfxBus, f, 0.15, at(i * 0.04))); },
  raidHorn:() => { horn(sfxBus, 147, 0.5, 0.22); horn(sfxBus, 147, 0.35, 0.2, at(0.55)); horn(sfxBus, 196, 0.8, 0.22, at(0.95)); thump(sfxBus, 0.35, at(0.95)); },
  bossDie: () => { thump(sfxBus, 0.4); [196, 165, 147, 110].forEach((f, i) => horn(sfxBus, f, 0.25, 0.15, at(i * 0.15))); },
  chest:   () => [294, 349, 440, 523, 587, 698, 880].forEach((f, i) => pluck(sfxBus, f, 0.2, at(i * 0.05))),
  win:     () => { [294, 294, 440, 587].forEach((f, i) => horn(sfxBus, f, i === 3 ? 0.9 : 0.28, 0.18, at(i * 0.3))); [587, 698, 880, 1175].forEach((f, i) => pluck(sfxBus, f, 0.2, at(1.2 + i * 0.06))); },
  lose:    () => { thump(sfxBus, 0.4); [220, 196, 175, 147].forEach((f, i) => horn(sfxBus, f, 0.5, 0.15, at(i * 0.45))); },
};

// ---- background music: lute melody in D dorian over a bagpipe-style drone
// (root + fifth each bar). Raids switch to a faster, darker tune with hand
// drums. 32 eighth-note steps per loop; 0 = rest, else MIDI note.
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const MEL_PEACE = [62, 0, 65, 67, 69, 0, 72, 69, 67, 0, 65, 62, 60, 62, 65, 0, 62, 0, 65, 67, 69, 0, 72, 74, 72, 0, 69, 67, 65, 67, 62, 0];
const MEL_RAID  = [62, 0, 62, 63, 65, 0, 63, 62, 60, 0, 60, 62, 63, 0, 62, 60, 58, 0, 58, 60, 62, 0, 63, 65, 63, 62, 60, 58, 57, 0, 58, 0];
var nextStep = 0, stepI = 0;

function musicTick() {
  if (!AC) return;
  while (nextStep < AC.currentTime + 0.2) {
    const raid = raiders && raiders.length > 0;
    playStep(stepI % 32, nextStep, raid);
    nextStep += raid ? 0.16 : 0.22;
    stepI++;
  }
}
function playStep(s, t0, raid) {
  if (muted || scene !== 'game') return;
  const mel = raid ? MEL_RAID : MEL_PEACE, stepDur = raid ? 0.16 : 0.22;
  if (mel[s]) pluck(musicBus, midi(mel[s]), 0.16, t0);
  if (s % 8 === 0) { // drone: D2 + A2, re-bowed each bar
    horn(musicBus, midi(38), stepDur * 8, 0.045, t0);
    horn(musicBus, midi(45), stepDur * 8, 0.03, t0);
  }
  if (raid && s % 4 === 0) thump(musicBus, 0.25, t0);
  if (raid && s % 4 === 2) _n(musicBus, 0.04, 0.06, 5000, t0);
}
