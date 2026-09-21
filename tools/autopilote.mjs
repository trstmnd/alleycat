// Autopilote de verification. Ouvre le jeu dans un navigateur, calcule le
// chemin optimal sur la carte, le suit, lance les trois colis et rend le temps.
//
// C'est la seule mesure qui prouve que le manifeste est reellement bouclable :
// check.sh teste les regles une par une, pas la course de bout en bout.
// Il sert aussi de repere pour le bareme des medailles.
//
// Il ne fait PAS partie du jeu : il vit hors de `src/`, le workflow de
// publication ne le copie pas, et le jeu garde zero dependance. Lui en a une,
// Playwright, volontairement a l'ecart.
//
//   npm i -g playwright && npx playwright install chromium   # une fois
//   python3 -m http.server 8012                              # dans un autre terminal
//   node tools/autopilote.mjs [url]
//
// Derniers reperes mesures : 42,17 s en v0.2, 41,70 s en v0.3 (le dérapage ne
// change rien pour lui, il le subit au lieu de l'exploiter). Un humain qui s'en
// sert pour porter sa vitesse en virage devrait faire mieux.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const URL_JEU = process.argv[2] || 'http://localhost:8012';
const ICI = dirname(fileURLToPath(import.meta.url));

// Playwright doit rester HORS du depot : un `npm i` local poserait un
// package.json, et check.sh refuse d'en voir un. On le cherche donc a cote, puis
// dans l'installation globale. NODE_PATH ne sert a rien ici : node l'ignore
// pour les imports ES.
async function chargerChromium() {
  const essais = [];
  if (process.env.PLAYWRIGHT_MODULE) essais.push(process.env.PLAYWRIGHT_MODULE);
  essais.push('playwright');
  try {
    const { execSync } = await import('node:child_process');
    const racine = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (racine) essais.push(join(racine, 'playwright', 'index.mjs'));
  } catch { /* npm absent : on se contente des autres pistes */ }
  for (const e of essais) {
    try { return (await import(e)).chromium; } catch { /* piste suivante */ }
  }
  return null;
}

const chromium = await chargerChromium();
if (!chromium) {
  console.error('Playwright introuvable. `npm i -g playwright && npx playwright install chromium`,');
  console.error('ou pointer PLAYWRIGHT_MODULE sur le index.mjs du module.');
  process.exit(2);
}

// city.js exporte en modules ES mais porte l'extension .js, que node lit en
// CommonJS. On le charge par data: URL plutot que de poser un package.json,
// qui casserait le controle "aucune dependance npm" de check.sh.
const source = readFileSync(join(ICI, '..', 'src', 'city.js'), 'utf8');
const { MAP, COLS, ROWS, CELL, START, DROPS } =
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

function cheminLePlusCourt(depart, arrivee) {
  const cle = (c) => c[0] + ',' + c[1];
  const vient = new Map([[cle(depart), null]]);
  const file = [depart];
  while (file.length) {
    const c = file.shift();
    if (c[0] === arrivee[0] && c[1] === arrivee[1]) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [c[0] + dx, c[1] + dy];
      if (n[0] < 0 || n[1] < 0 || n[0] >= COLS || n[1] >= ROWS) continue;
      if (MAP[n[1]][n[0]] !== '.' || vient.has(cle(n))) continue;
      vient.set(cle(n), c);
      file.push(n);
    }
  }
  const out = [];
  let c = arrivee;
  while (c) { out.push(c); c = vient.get(cle(c)); }
  return out.reverse();
}

let ou = [START.cx, START.cy];
const etapes = DROPS.map((d) => {
  const p = cheminLePlusCourt(ou, [d.cx, d.cy]);
  ou = [d.cx, d.cy];
  // Un point de passage sur trois suffit a guider, et evite de zigzaguer.
  return p.filter((_, i) => i % 3 === 0 || i === p.length - 1)
          .map(([cx, cy]) => [(cx + 0.5) * CELL, (cy + 0.5) * CELL]);
});

const nav = await chromium.launch();
const page = await nav.newPage({ viewport: { width: 1100, height: 700 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
await page.goto(URL_JEU + '/?cb=' + Date.now(), { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__alleycat, null, { timeout: 15000 });
await page.evaluate(() => window.__alleycat.show('race'));

const bilan = await page.evaluate((etapes) => {
  const A = window.__alleycat;
  const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  const journal = [];
  let pasEnDerive = 0, pas = 0, deriveMax = 0;
  for (let i = 0; i < etapes.length; i++) {
    const wps = etapes[i];
    const depot = wps[wps.length - 1];
    let w = 0, garde = 0;
    while (garde++ < 12000) {
      const v = A.state.bike;
      pas++;
      if (v.sliding) pasEnDerive++;
      deriveMax = Math.max(deriveMax, Math.abs(v.slip));
      const d = Math.hypot(depot[0] - v.x, depot[1] - v.y);
      const vise = norm(Math.atan2(depot[1] - v.y, depot[0] - v.x) - v.heading);
      // Portee du colis : voir PARCEL dans src/parcel.js
      const portee = (105 + 1.15 * v.speed - 14) / 2.2;
      const approche = w >= wps.length - 2 || d < 260;
      if (approche && d <= portee + 12 && Math.abs(vise) < 0.2) {
        const r = A.toss();
        journal.push('etape ' + (i + 1) + ' : lance a ' + Math.round(d) +
                     ' u, vitesse ' + Math.round(v.speed) + ', ' + (r.onGround ? 'A COTE' : 'depose'));
        if (r.onGround) return { ok: false, journal, pourquoi: 'colis a cote' };
        break;
      }
      const but = approche ? depot : wps[Math.min(w, wps.length - 1)];
      if (!approche && Math.hypot(but[0] - v.x, but[1] - v.y) < 46 && w < wps.length - 1) { w++; continue; }
      const veut = norm(Math.atan2(but[1] - v.y, but[0] - v.x) - v.heading);
      A.drive(1 / 60, Math.max(-1, Math.min(1, veut * 2.6)), Math.abs(veut) > 0.5);
    }
  }
  return {
    ok: A.state.done, t: A.state.t, journal,
    pctDerive: Math.round(100 * pasEnDerive / pas),
    deriveMax: +deriveMax.toFixed(2)
  };
}, etapes);

console.log(bilan.journal.join('\n'));
console.log('manifeste boucle :', bilan.ok, bilan.pourquoi || '');
if (bilan.ok) {
  console.log('temps : ' + bilan.t.toFixed(2) + ' s');
  console.log('en derive ' + bilan.pctDerive + '% du temps, angle max ' + bilan.deriveMax + ' rad');
}
console.log('erreurs console :', erreurs.length ? erreurs : 'aucune');
await nav.close();
process.exit(bilan.ok && !erreurs.length ? 0 : 1);
