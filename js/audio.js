// Procedural music + sound effects via Web Audio — no audio files needed.
// Everything no-ops until the first user gesture creates the AudioContext
// (browser autoplay rule) and when running headless in test/smoke.js.
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
  musicBus = AC.createGain(); musicBus.gain.value = 0.35; musicBus.connect(AC.destination);
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

// ---- sound effects (call these from gameplay code) ----
const sfx = {
  swing:   () => hiss(0.09, 0.12, 2400),
  chop:    () => { hiss(0.08, 0.25, 700); tone(90, 0.08, 'square', 0.12, 60); },
  mine:    () => { hiss(0.05, 0.2, 3000); tone(1800, 0.05, 'square', 0.06); },
  hit:     () => { tone(220, 0.08, 'sawtooth', 0.15, 110); hiss(0.06, 0.15, 900); },
  kill:    () => [330, 440, 550].forEach((f, i) => tone(f, 0.08, 'square', 0.1, null, at(i * 0.07))),
  pickup:  () => { tone(660, 0.06, 'triangle', 0.12); tone(990, 0.09, 'triangle', 0.12, null, at(0.06)); },
  hurt:    () => tone(180, 0.2, 'sawtooth', 0.18, 70),
  build:   () => { hiss(0.1, 0.2, 500); tone(392, 0.08, 'triangle', 0.12, null, at(0.05)); tone(523, 0.12, 'triangle', 0.12, null, at(0.13)); },
  deny:    () => tone(160, 0.15, 'square', 0.12, 120),
  arrow:   () => hiss(0.12, 0.08, 4000),
  raidHorn:() => { tone(147, 0.4, 'sawtooth', 0.14); tone(220, 0.4, 'sawtooth', 0.1); tone(147, 0.6, 'sawtooth', 0.14, null, at(0.45)); tone(196, 0.6, 'sawtooth', 0.1, null, at(0.45)); },
  bossDie: () => { hiss(0.4, 0.25, 300); [392, 311, 247, 196].forEach((f, i) => tone(f, 0.2, 'sawtooth', 0.1, null, at(i * 0.12))); },
  chest:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.12, null, at(i * 0.09))),
  win:     () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.2, 'square', 0.12, null, at(i * 0.16))),
  lose:    () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, 'triangle', 0.12, null, at(i * 0.26))),
};

// ---- background music: a 32-step chiptune loop in D minor; switches to a
// faster, darker pattern while a raid is underway. 0 = rest, else MIDI note.
const midi = m => 440 * Math.pow(2, (m - 69) / 12);
const MEL_PEACE  = [62, 0, 65, 67, 69, 0, 72, 69, 67, 0, 65, 62, 60, 62, 65, 0, 62, 0, 65, 67, 69, 0, 72, 74, 72, 0, 69, 67, 65, 67, 62, 0];
const BASS_PEACE = [38, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 45, 0, 0, 0, 38, 0, 0, 0, 45, 0, 0, 0, 36, 0, 0, 0, 43, 0, 0, 0];
const MEL_RAID   = [62, 0, 62, 63, 65, 0, 63, 62, 60, 0, 60, 62, 63, 0, 62, 60, 58, 0, 58, 60, 62, 0, 63, 65, 63, 62, 60, 58, 57, 0, 58, 0];
const BASS_RAID  = [38, 38, 0, 38, 38, 38, 0, 38, 36, 36, 0, 36, 36, 36, 0, 36, 34, 34, 0, 34, 34, 34, 0, 34, 33, 33, 0, 33, 45, 0, 43, 0];
var nextStep = 0, stepI = 0;

function musicTick() {
  if (!AC) return;
  while (nextStep < AC.currentTime + 0.2) {
    const raid = raiders && raiders.length > 0;
    playStep(stepI % 32, nextStep, raid);
    nextStep += raid ? 0.16 : 0.21;
    stepI++;
  }
}
function playStep(s, t0, raid) {
  if (muted || scene !== 'game') return;
  const mel = raid ? MEL_RAID : MEL_PEACE, bass = raid ? BASS_RAID : BASS_PEACE;
  if (mel[s]) _o(musicBus, midi(mel[s]), raid ? 0.14 : 0.19, 'square', 0.045, null, t0);
  if (bass[s]) _o(musicBus, midi(bass[s]), raid ? 0.15 : 0.4, 'triangle', 0.07, null, t0);
  if (raid && s % 2 === 0) _n(musicBus, 0.03, 0.05, 6000, t0);
}
