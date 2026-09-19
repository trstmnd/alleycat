import { ok, load } from './_ok.mjs';
const { newBike, stepBike } = await load('bike');
const { throwParcel, stepParcel } = await load('parcel');
const C = await load('city');
const STEP = 1 / 120;

// L invariant qui porte tout le design : a pas fixe, memes entrees, meme
// resultat au bit pres. C est ce qui rend le restart instantane honnete et le
// fantome credible. Le jour ou ce controle passe au rouge, le jeu est casse.
const SCRIPT = [
  [1.2, 0, false], [0.7, 1, false], [1.5, 0, false], [0.5, -1, true],
  [2.0, 0, false], [0.9, 1, true], [1.1, -1, false], [1.4, 0, false]
];

function replay() {
  const s = C.center(C.START);
  const b = newBike(s.x, s.y, C.START.heading);
  for (const [sec, steer, skid] of SCRIPT) {
    for (let i = 0; i < Math.round(sec / STEP); i++) stepBike(b, steer, skid, STEP, C.solid);
  }
  const p = throwParcel(b);
  let n = 0;
  while (!p.resting && n++ < 4000) stepParcel(p, STEP, C.solid);
  return { b, p };
}

const a = replay();
const z = replay();
for (const k of ['x', 'y', 'heading', 'speed', 'stun']) {
  ok(a.b[k] === z.b[k], 'velo non deterministe sur ' + k + ' : ' + a.b[k] + ' contre ' + z.b[k]);
}
ok(a.p.x === z.p.x && a.p.y === z.p.y, 'colis non deterministe');

// Et le run doit vraiment aller quelque part, sinon le controle ne prouve rien
const s = C.center(C.START);
ok(Math.hypot(a.b.x - s.x, a.b.y - s.y) > 300, 'le scenario ne bouge pas assez pour prouver quoi que ce soit');
