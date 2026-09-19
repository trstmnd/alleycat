import { ok, load } from './_ok.mjs';
const G = await load('ghost');

const rec = G.newRecorder();
const bike = { x: 0, y: 0, heading: 0 };
for (let i = 0; i <= 60; i++) {
  bike.x = i * 10;
  bike.y = i;
  G.record(rec, i * G.STEP, bike);
}
ok(rec.samples.length >= 60 * 3, 'trop peu d echantillons : ' + rec.samples.length);

const mid = G.sampleAt(rec.samples, G.STEP * 2.5);
ok(Math.abs(mid.x - 25) < 1e-6, 'interpolation fausse : ' + mid.x);
ok(G.sampleAt(rec.samples, 1e6) === null, 'le fantome devrait finir sa course');
ok(G.sampleAt([], 0) === null, 'un fantome vide devrait rendre null');

// Le cap s interpole par le plus court chemin : sans ca le fantome fait un
// tour complet chaque fois qu il passe par pi.
const wrap = [0, 0, Math.PI - 0.1, 0, 0, -Math.PI + 0.1];
const h = G.sampleAt(wrap, G.STEP * 0.5).heading;
ok(Math.abs(h) > Math.PI - 0.2, 'le cap ne prend pas le plus court chemin : ' + h);
