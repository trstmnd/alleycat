// Sons synthetises. Aucun fichier audio, aucun asset binaire.

let ctx = null;
let muted = false;

export function setMuted(v) { muted = !!v; }
export function isMuted() { return muted; }

// Le contexte ne peut naitre que sur un geste : un AudioContext cree au
// chargement reste suspendu et le son ne sort jamais.
export function wake() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function blip(freq, dur, type = 'sine', gain = 0.14, slide = 0) {
  if (muted || !ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
  env.gain.setValueAtTime(0, t);
  env.gain.linearRampToValueAtTime(gain, t + 0.008);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(env).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

let skidNode = null;
export function skidSound(on) {
  if (!ctx || muted) return;
  if (on && !skidNode) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.35;
    const src = ctx.createBufferSource();
    const flt = ctx.createBiquadFilter();
    const g = ctx.createGain();
    src.buffer = buf; src.loop = true;
    flt.type = 'bandpass'; flt.frequency.value = 1400; flt.Q.value = 0.8;
    g.gain.value = 0.1;
    src.connect(flt).connect(g).connect(ctx.destination);
    src.start();
    skidNode = { src, g };
  } else if (!on && skidNode) {
    skidNode.src.stop();
    skidNode = null;
  }
}

export const sfx = {
  throwIt() { blip(520, 0.12, 'triangle', 0.12, 260); },
  landed() { blip(760, 0.1); setTimeout(() => blip(1140, 0.2), 70); },
  missed() { blip(190, 0.22, 'sawtooth', 0.1, -80); },
  graze() { blip(320, 0.05, 'square', 0.05); },
  crash() { blip(110, 0.32, 'sawtooth', 0.14, -50); },
  finish() { blip(660, 0.14); setTimeout(() => blip(880, 0.14), 130); setTimeout(() => blip(1320, 0.32), 260); }
};
