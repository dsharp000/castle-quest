// The Vengeful Volcano finale: once you TAME the dragon, this cinematic plays
// before the win screen — the knight feeds it, climbs on, and rides off into
// the volcano's smoke. Started by main.js (startCutscene), it hands back to the
// win screen (winRun) when it finishes or is skipped. Drawn in screen space
// with its own bespoke side-view dragon/knight (the combat pose is reared, not
// ideal for flying), tinted by the level theme. `cs` = cutscene frame counter.
var cs = 0, cutFinishFrames = 0, cutPreview = false; // PREVIEW: cutPreview loops the scene from the title screen
const FEED_END = 130, MOUNT_END = 210, LIFT_END = 320, FLY_END = 470, CUT_END = 505;

function startCutscene(frames) { cs = 0; cutFinishFrames = frames; scene = 'cutscene'; }
function endCutscene() { // skip or natural end → win screen
  if (scene !== 'cutscene') return;
  if (cutPreview) { cutPreview = false; scene = 'title'; return; } // PREVIEW: return to title, record nothing
  winRun(cutFinishFrames);
}
// PREVIEW: watch the finale from the title screen (C key); loops until you tap / press a key.
function previewCutscene() { loadLevel(4); selLevel = 4; cutPreview = true; startCutscene(0); }
function updateCutscene() {
  cs++;
  if (cs === MOUNT_END) sfx.raidHorn(); // wing-beat roar as it takes off
  if (cs >= CUT_END) { if (cutPreview) cs = 0; else endCutscene(); } // PREVIEW: loop instead of ending
}

const _clamp = u => u < 0 ? 0 : u > 1 ? 1 : u;
const _ease = u => { u = _clamp(u); return u * u * (3 - 2 * u); };
const _lerp = (a, b, u) => a + (b - a) * u;

// The dragon for the cutscene IS the in-game dragon: same drawDragonBody() art,
// drawn feet-down at (cx,cy) and scaled by s, facing right (flight direction).
// `wf` is the wing-flap offset in px. Returns the mouth + saddle in screen space.
function drawCutsceneDragon(cx, cy, s, wf) {
  const b = level.boss;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  const a = drawDragonBody(b.c1 || '#8a1f18', b.c2 || '#f0761e', { bob: Math.sin(t / 7) * 3, wf: wf, flame: true });
  ctx.restore();
  return { hx: cx + a.mouthX * s, hy: cy + a.mouthY * s, sadX: cx + a.sadX * s, sadY: cy + a.sadY * s };
}

// A small knight (matching the in-game palette) around feet (kx,ky). `arm`
// raises the near arm (feeding / holding on); face flips left/right.
function drawCutsceneKnight(kx, ky, s, face, arm) {
  ctx.save(); ctx.translate(kx, ky); ctx.scale(s * (face || 1), s);
  ctx.fillStyle = '#4a3560'; ctx.fillRect(-8, -14, 7, 14); ctx.fillRect(2, -14, 7, 14); // legs
  ctx.fillStyle = '#7a1f2b'; ctx.fillRect(-10, -36, 20, 24);                             // tunic
  ctx.fillStyle = '#c9a86a'; ctx.fillRect(-10, -30, 20, 4);                              // belt
  ctx.fillStyle = '#e8c39e'; ctx.fillRect(-8, -52, 16, 16);                              // face
  ctx.fillStyle = '#8d8d9a'; ctx.fillRect(-10, -56, 20, 9); ctx.fillRect(-10, -56, 5, 16); // helmet
  ctx.fillStyle = '#2b2140'; ctx.fillRect(2, -48, 4, 4);                                 // visor slit
  // raised near arm
  ctx.save(); ctx.translate(9, -32); ctx.rotate(-arm * 1.3);
  ctx.fillStyle = '#7a1f2b'; ctx.fillRect(-2, -16, 5, 18);
  ctx.fillStyle = '#e8c39e'; ctx.fillRect(-3, -20, 7, 6); // hand
  ctx.restore();
  ctx.restore();
}

function drawCutscene() {
  const th = level.theme || {};
  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, th.sky0 || '#1a0d0e'); g.addColorStop(.55, th.sky1 || '#5a1c14');
  g.addColorStop(.56, th.deep0 || '#3a1410'); g.addColorStop(1, th.deep1 || '#1c0806');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // background volcano cone with a glowing crater
  ctx.fillStyle = th.far || '#280c0a';
  ctx.beginPath(); ctx.moveTo(560, 400); ctx.lineTo(720, 150); ctx.lineTo(884, 400); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ff6a1e'; ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t / 12);
  ctx.beginPath(); ctx.ellipse(720, 154, 26, 10, 0, 0, 2 * Math.PI); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#ff7a1e'; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(712, 160); ctx.lineTo(700, 250); ctx.moveTo(730, 160); ctx.lineTo(744, 240); ctx.stroke(); ctx.globalAlpha = 1;
  // crater smoke plume
  for (let i = 0; i < 7; i++) { const p = (t / 2 + i * 44) % 320; ctx.fillStyle = '#2a2024'; ctx.globalAlpha = 0.32 * (1 - p / 320); ctx.beginPath(); ctx.arc(720 + Math.sin((p + i * 30) / 40) * 30, 150 - p, 22 + p * 0.13, 0, 2 * Math.PI); ctx.fill(); }
  ctx.globalAlpha = 1;
  // drifting embers rising
  ctx.fillStyle = '#ffb02e'; ctx.globalAlpha = 0.5;
  for (let i = 0; i < 26; i++) { const ex = (i * 137) % W, ey = H - ((t * 1.3 + i * 80) % (H + 40)); ctx.fillRect(ex, ey, 3, 3); }
  ctx.globalAlpha = 1;
  // ground
  ctx.fillStyle = th.ground || '#2e2422'; ctx.fillRect(0, 400, W, H - 400);
  ctx.fillStyle = th.edge || '#120c0a'; ctx.fillRect(0, 400, W, 6);

  const gy = 396;
  const feed = cs < FEED_END, mount = cs >= FEED_END && cs < MOUNT_END, lift = cs >= MOUNT_END && cs < LIFT_END, fly = cs >= LIFT_END;
  // ---- dragon choreography (feet on the ground, then rising away) ----
  let dx, dy, ds, wf;
  if (feed || mount) { dx = 430; dy = gy; ds = 1.15; wf = Math.sin(t / 9) * 6; }
  else if (lift) { const u = _ease((cs - MOUNT_END) / (LIFT_END - MOUNT_END)); dx = 430; dy = _lerp(gy, gy - 150, u); ds = 1.15; wf = Math.sin(t / 5) * (8 + 12 * u); }
  else { const u = _ease((cs - LIFT_END) / (FLY_END - LIFT_END)); dx = _lerp(430, W + 240, u); dy = _lerp(gy - 150, 40, u); ds = _lerp(1.15, 0.3, u); wf = Math.sin(t / 5) * 20; }
  // liftoff dust
  if (lift && cs < MOUNT_END + 30) { ctx.fillStyle = '#6a5a52'; ctx.globalAlpha = 0.4; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI; ctx.beginPath(); ctx.arc(dx + Math.cos(a) * (40 + (cs - MOUNT_END) * 3), gy - Math.sin(a) * 10, 10, 0, 2 * Math.PI); ctx.fill(); } ctx.globalAlpha = 1; }

  const anchor = drawCutsceneDragon(dx, dy, ds, wf); // mouth faces +x (right); saddle sits on the back

  // ---- knight choreography ----
  if (feed) {
    const kx = anchor.hx + 40, ky = gy; // stand just past the muzzle
    const bite = Math.floor(cs / 26) % 2 === 0 ? 0.9 : 0.4; // arm bobs as it feeds
    drawCutsceneKnight(kx, ky, 1, -1, bite);
    // meat pieces flying from hand up to the dragon's mouth; a heart on each bite
    for (let m = 0; m < 4; m++) {
      const st = 14 + m * 26, u = (cs - st) / 22;
      if (u >= 0 && u <= 1) {
        const mx = _lerp(kx - 14, anchor.hx, u), my = _lerp(ky - 44, anchor.hy, u) - Math.sin(u * Math.PI) * 30;
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.fillText('🥩', mx, my); ctx.textAlign = 'left';
      } else if (u > 1 && u < 1.5) {
        ctx.globalAlpha = 1 - (u - 1) / 0.5; ctx.font = '18px serif'; ctx.textAlign = 'center';
        ctx.fillText('❤️', anchor.hx, anchor.hy - 20 - (u - 1) * 40); ctx.textAlign = 'left'; ctx.globalAlpha = 1;
      }
    }
  } else if (mount) {
    const u = _ease((cs - FEED_END) / (MOUNT_END - FEED_END));
    const kx = _lerp(anchor.hx + 40, anchor.sadX, u), ky = _lerp(gy, anchor.sadY, u) - Math.sin(u * Math.PI) * 50;
    drawCutsceneKnight(kx, ky, _lerp(1, ds * 0.8, u), -1, 0.3);
  } else {
    drawCutsceneKnight(anchor.sadX, anchor.sadY, ds * 0.8, 1, 0.7 + Math.sin(t / 6) * 0.15); // riding forward, waving
  }

  // ---- smoke bank the dragon flies into (top-right), thickening as it goes ----
  if (fly) {
    const u = _ease((cs - LIFT_END) / (FLY_END - LIFT_END));
    for (let i = 0; i < 12; i++) { const a = i * 1.7 + t / 40; ctx.fillStyle = i % 2 ? '#2a2226' : '#3a2f2c'; ctx.globalAlpha = Math.min(0.9, u * 1.1); ctx.beginPath(); ctx.arc(W - 120 + Math.cos(a) * 90 * u, 120 + Math.sin(a) * 60 * u, 34 + i * 5 * u, 0, 2 * Math.PI); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // end fade
  if (cs > FLY_END) { ctx.fillStyle = '#0c0605'; ctx.globalAlpha = _ease((cs - FLY_END) / (CUT_END - FLY_END)); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }

  // (no narration captions — the scene plays wordlessly)
  // skip hint
  ctx.font = '12px sans-serif'; ctx.fillStyle = '#c9b68a99'; ctx.textAlign = 'right';
  ctx.fillText('tap / press any key to skip →', W - 14, H - 12); ctx.textAlign = 'left';
}
