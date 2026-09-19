// Machine d'etats des ecrans, boucle rAF, HUD, sauvegarde.
// Seul module qui touche au DOM.

import * as City from './city.js';
import { newBike, stepBike, BIKE } from './bike.js';
import { throwParcel, stepParcel, inZone, PARCEL } from './parcel.js';
import * as Race from './race.js';
import { newRecorder, record, sampleAt } from './ghost.js';
import { createRenderer } from './render.js';
import { newInput, install } from './input.js';
import { sfx, skidSound, setMuted, isMuted, wake } from './audio.js';

export const VERSION = 'v0.2';

// Pas de simulation fixe. La boucle rAF a un dt variable : simuler dessus
// rendrait la course dependante du taux de rafraichissement et le fantome
// mentirait. Tout le determinisme du jeu tient a cette constante.
export const SIM_STEP = 1 / 120;

const KEY_BEST = 'alleycat.best';
const KEY_GHOST = 'alleycat.ghost';
const KEY_MUTE = 'alleycat.muted';
const PICKUP = 22;
const MAX_SKIDS = 900;

const $ = (s) => document.querySelector(s);
const el = {
  version: $('#version'), loading: $('#loading'),
  time: $('#hud-time'), drop: $('#hud-drop'), street: $('#hud-street'),
  legs: $('#hud-legs'), speed: $('#hud-speed'), parcel: $('#hud-parcel'),
  target: $('#hud-target'), callout: $('#callout'), pause: $('#pause'),
  endTitle: $('#end-title'), endTime: $('#end-time'), endMedal: $('#end-medal'),
  endBest: $('#end-best'), endSplits: $('#end-splits'), sound: $('#sound')
};

let view, input;
let screen = 'title';
let bike, race, rec, ghostSamples, flying, onGround, carrying;
let parcels = [], skids = [];
let best = Number(localStorage.getItem(KEY_BEST) || 0) || null;
let acc = 0, last = 0, clock = 0, paused = false;

function show(name) {
  screen = name;
  for (const s of document.querySelectorAll('.screen')) s.classList.toggle('on', s.id === 's-' + name);
  document.body.classList.toggle('racing', name === 'race');
  if (name === 'race') reset();
  if (name === 'end') fillEnd();
}

function loadGhost() {
  try {
    const raw = localStorage.getItem(KEY_GHOST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function reset() {
  const s = City.center(City.START);
  bike = newBike(s.x, s.y, City.START.heading);
  race = Race.newRace(City.DROPS.length);
  rec = newRecorder();
  ghostSamples = loadGhost();
  flying = null;
  onGround = null;
  carrying = true;
  parcels = [];
  skids = [];
  acc = 0;
  paused = false;
  el.pause.classList.remove('on');
  skidSound(false);
  refreshHud();
}

function targetCenter() {
  const d = City.DROPS[race.leg];
  return d ? City.center(d) : null;
}

function callout(text, tone) {
  el.callout.textContent = text;
  el.callout.className = 'on ' + tone;
  setTimeout(() => { el.callout.className = tone; }, 700);
}

function refreshHud() {
  const d = City.DROPS[race.leg];
  el.time.textContent = Race.fmt(race.t);
  el.drop.textContent = d ? d.name : 'FINI';
  el.street.textContent = d ? d.street : '';
  el.legs.textContent = Math.min(race.leg + 1, race.total) + '/' + race.total;
  el.speed.textContent = Math.round(bike.speed / BIKE.maxSpeed * 100);
  el.parcel.textContent = flying ? 'EN L\'AIR' : onGround ? 'AU SOL' : 'EN SACOCHE';
  el.parcel.className = onGround ? 'warn' : '';
  const m = Race.MEDALS.find((x) => race.t <= x.time);
  el.target.textContent = m ? m.label + ' ' + Race.fmt(m.time) : 'HORS DELAI';
}

// Un pas de simulation a dt fixe. Deterministe de bout en bout : memes
// entrees, meme resultat, c'est ce qui rend le restart instantane honnete.
function simulate(dt) {
  if (race.done) return;
  race.t += dt;

  const wasSkid = bike.skid;
  const px = bike.x, py = bike.y;
  stepBike(bike, input.steer, input.skid, dt, City.solid);

  if (bike.skid) {
    skids.push([px, py, bike.x, bike.y]);
    if (skids.length > MAX_SKIDS) skids.shift();
  }
  if (bike.skid !== wasSkid) skidSound(bike.skid);
  if (bike.hit === 2) sfx.crash();
  else if (bike.hit === 1) sfx.graze();

  if (flying) {
    stepParcel(flying, dt, City.solid);
    if (flying.resting) {
      const tc = targetCenter();
      if (tc && inZone(flying, tc)) {
        parcels.push({ x: flying.x, y: flying.y, ok: true });
        Race.deliver(race);
        flying = null;
        carrying = true;
        sfx.landed();
        callout(race.done ? 'MANIFESTE BOUCLE' : 'DEPOSE', 'good');
        if (race.done) { sfx.finish(); skidSound(false); finish(); }
      } else {
        onGround = { x: flying.x, y: flying.y };
        flying = null;
        sfx.missed();
        callout('A COTE', 'bad');
      }
    }
  }

  if (onGround && Math.hypot(bike.x - onGround.x, bike.y - onGround.y) < PICKUP) {
    onGround = null;
    carrying = true;
    callout('REPRIS', 'warn');
  }

  record(rec, race.t, bike);
}

function finish() {
  const t = race.t;
  if (!best || t < best) {
    best = t;
    localStorage.setItem(KEY_BEST, String(t));
    // Le fantome est arrondi au dixieme d'unite : la precision au-dela ne se
    // voit pas et triple le poids dans localStorage.
    localStorage.setItem(KEY_GHOST, JSON.stringify(rec.samples.map((v) => Math.round(v * 10) / 10)));
  }
  setTimeout(() => show('end'), 700);
}

function fillEnd() {
  const t = race.t;
  const m = Race.medalFor(t);
  const isBest = best !== null && Math.abs(best - t) < 1e-9;
  el.endTitle.textContent = isBest ? 'RECORD PERSONNEL' : 'LIVRE';
  el.endTime.textContent = Race.fmt(t);
  el.endMedal.textContent = m ? m.label : 'HORS DELAI';
  el.endMedal.className = 'medal ' + (m ? m.key : 'none');
  el.endBest.textContent = best ? 'Meilleur : ' + Race.fmt(best) : '';
  el.endSplits.innerHTML = race.splits
    .map((s, i) => '<li><span>' + City.DROPS[i].name + '</span><b>' + Race.fmt(s) + '</b></li>')
    .join('');
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.25);
  last = now;
  clock += dt;

  if (screen === 'race' && !paused) {
    if (input.restart) { input.restart = false; reset(); }
    if (input.throwEdge) {
      input.throwEdge = false;
      if (carrying && !flying && !race.done) {
        flying = throwParcel(bike);
        carrying = false;
        sfx.throwIt();
      }
    }
    acc += dt;
    let guard = 0;
    while (acc >= SIM_STEP && guard++ < 600) { simulate(SIM_STEP); acc -= SIM_STEP; }
    refreshHud();
  } else {
    input.throwEdge = false;
    input.restart = false;
  }

  if (bike) {
    view.draw({
      bike, target: screen === 'race' ? targetCenter() : null,
      parcels: onGround ? parcels.concat([{ x: onGround.x, y: onGround.y, ok: false }]) : parcels,
      flying, skids, t: clock,
      ghost: screen === 'race' && ghostSamples ? sampleAt(ghostSamples, race.t) : null
    });
  }
}

function boot() {
  const canvas = $('#scene');
  view = createRenderer(canvas);
  input = newInput();
  install(input, canvas);

  el.version.textContent = VERSION;
  el.loading.classList.add('off');

  setMuted(localStorage.getItem(KEY_MUTE) === '1');
  el.sound.setAttribute('aria-pressed', String(isMuted()));
  el.sound.addEventListener('click', () => {
    setMuted(!isMuted());
    if (isMuted()) skidSound(false);
    localStorage.setItem(KEY_MUTE, isMuted() ? '1' : '0');
    el.sound.setAttribute('aria-pressed', String(isMuted()));
  });

  for (const b of document.querySelectorAll('[data-go]')) {
    b.addEventListener('click', (e) => { e.stopPropagation(); wake(); show(b.dataset.go); });
  }
  $('#pause-resume').addEventListener('click', () => { paused = false; el.pause.classList.remove('on'); });

  // rAF est ralenti des que l'onglet passe en arriere plan : sans pause le
  // chrono continuerait et le run serait perdu sans que le joueur voie rien.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === 'race') {
      paused = true;
      skidSound(false);
      el.pause.classList.add('on');
    }
  });

  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.code !== 'Enter') return;
    if (screen === 'title') { wake(); show('race'); }
    else if (screen === 'end') { wake(); show('race'); }
  });

  reset();
  show('title');
  last = performance.now();
  requestAnimationFrame(loop);

  // Crochet de test : seule mesure fiable, rAF n'etant pas pilotable.
  window.__alleycat = {
    get state() { return { screen, t: race.t, leg: race.leg, done: race.done, bike, carrying, flying, onGround }; },
    get paused() { return paused; },
    set paused(v) { paused = v; },
    show,
    // Avance la simulation de `sec` secondes au pas fixe, avec des entrees
    // imposees. Renvoie l'etat, ce qui permet de rejouer un run a l'identique.
    drive(sec, steer = 0, skid = false) {
      const saved = { steer: input.steer, skid: input.skid };
      input.steer = steer; input.skid = skid;
      const n = Math.round(sec / SIM_STEP);
      for (let i = 0; i < n; i++) simulate(SIM_STEP);
      input.steer = saved.steer; input.skid = saved.skid;
      refreshHud();
      return { t: race.t, x: bike.x, y: bike.y, heading: bike.heading, speed: bike.speed };
    },
    toss() {
      if (carrying && !flying) { flying = throwParcel(bike); carrying = false; }
      let guard = 0;
      while (flying && guard++ < 2000) simulate(SIM_STEP);
      return { leg: race.leg, done: race.done, onGround: !!onGround };
    },
    reset
  };
}

boot();
