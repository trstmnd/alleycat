import { ok, load, lcg } from './_ok.mjs';
const { newBike, stepBike, rearWheel, wrapAngle, BIKE } = await load('bike');
const C = await load('city');
const STEP = 1 / 120;
const open = () => false;

const run = (b, sec, steer, lock, solid = open, step = STEP) => {
  for (let i = 0; i < Math.round(sec / step); i++) stepBike(b, steer, lock, step, solid);
  return b;
};
const fast = (v = BIKE.maxSpeed) => Object.assign(newBike(600, 600, 0), { speed: v });

// Ligne droite : on approche le max sans jamais le depasser, et rien ne derape
const a = run(newBike(600, 600, 0), 4, 0, false);
ok(a.speed <= BIKE.maxSpeed + 1e-9, 'vitesse au dessus du max');
ok(a.speed > BIKE.maxSpeed * 0.9, 'trop lent en ligne droite : ' + a.speed);
ok(Math.abs(a.slip) < 1e-6, 'ca derape en ligne droite : ' + a.slip);
ok(!a.sliding, 'sliding en ligne droite');

// Un virage sec a haute vitesse decroche tout seul, sans rien demander
const hot = run(fast(), 0.4, 1, false);
ok(hot.sliding, 'un virage sec a pleine vitesse devrait decrocher');
ok(Math.abs(hot.slip) > 0.2, 'angle de derive trop faible : ' + hot.slip);

// Le meme virage a basse vitesse tient la route
const cold = run(fast(40), 0.15, 1, false);
ok(!cold.sliding, 'ca decroche a basse vitesse, la limite est mal placee');
ok(Math.abs(cold.slip) < 0.25, 'derive trop ouverte en adherence : ' + cold.slip);

// L angle de derive est borne, sinon le velo part en toupie
for (let i = 0; i < 400; i++) {
  const b = fast();
  run(b, 0.02 * i, i % 2 ? 1 : -1, i % 3 === 0);
  ok(Math.abs(b.slip) <= BIKE.maxSlip + 1e-9, 'derive hors bornes : ' + b.slip);
}

// Bloquer la roue arriere sert dans les virages moyens : ceux qui tiennent
// tout seuls. A braquage plein et pleine vitesse le decrochage subi sature
// deja a l'angle maximal, donc le bouton n'y ajoute rien, et c'est voulu :
// il sert a choisir de casser l'adherence, pas a deraper davantage.
const midFree = run(fast(140), 0.45, 0.5, false);
const midLock = run(fast(140), 0.45, 0.5, true);
ok(!midFree.sliding, 'un virage moyen devrait tenir tout seul');
ok(midLock.sliding, 'bloquer devrait casser l adherence dans un virage moyen');
ok(Math.abs(midLock.slip) > Math.abs(midFree.slip) + 0.15, 'bloquer ne derape pas plus : '
   + midLock.slip.toFixed(3) + ' contre ' + midFree.slip.toFixed(3));
ok(midLock.speed < midFree.speed, 'bloquer ne freine pas plus');

// A braquage plein les deux saturent, mais bloquer y arrive plus vite
const free = run(fast(), 0.5, 1, false);
const lock = run(fast(), 0.5, 1, true);
ok(lock.speed < free.speed, 'bloquer n accelere pas la mise en travers');

// Le pneu qui glisse est le seul frein : deraper coute bien plus que rouler
const straight = run(fast(), 0.6, 0, false);
ok(free.speed < straight.speed * 0.75, 'deraper ne freine pas assez : ' + free.speed + ' contre ' + straight.speed);

// Un mur de face remet le velo dans l axe
const wall = (x) => x > 900;
const crashed = run(fast(), 3, 0, false, (x) => wall(x));
ok(crashed.stun > 0 || crashed.speed < BIKE.maxSpeed * 0.5, 'le mur n a pas arrete le velo');
ok(Math.abs(crashed.slip) < 1e-9 || crashed.stun === 0, 'le velo derape encore apres un mur de face');

// Pied a terre : on ne relance pas
const stunned = Object.assign(fast(200), { stun: 0.3 });
const before = stunned.speed;
stepBike(stunned, 0, false, STEP, open);
ok(stunned.speed <= before + 1e-9, 'on relance pendant le pied a terre');

// La roue arriere est bien derriere le velo
const rw = rearWheel(newBike(100, 100, 0));
ok(Math.abs(rw.x - (100 - BIKE.wheelBase)) < 1e-9 && Math.abs(rw.y - 100) < 1e-9, 'roue arriere mal placee');
ok(Math.abs(wrapAngle(Math.PI * 3)) <= Math.PI + 1e-9, 'wrapAngle ne ramene pas dans [-pi, pi]');

// Le rattrapage de trajectoire est exponentiel, donc independant du pas de
// temps : a 1/240 s le velo doit finir quasiment au meme endroit qu a 1/120 s.
const A = run(fast(), 1.2, 1, false, open, 1 / 120);
const B = run(fast(), 1.2, 1, false, open, 1 / 240);
const drift = Math.hypot(A.x - B.x, A.y - B.y);
ok(drift < 6, 'la derive depend du pas de temps : ' + drift.toFixed(2) + ' unites d ecart');
ok(Math.abs(A.slip - B.slip) < 0.04, 'angle de derive dependant du pas : ' + (A.slip - B.slip));

// Invariant dur : quoi qu on fasse, le velo ne finit jamais dans un mur.
for (let seed = 1; seed <= 12; seed++) {
  const rnd = lcg(seed * 7919);
  const st = C.center(C.START);
  const b = newBike(st.x, st.y, C.START.heading);
  let steer = 0, lk = false;
  for (let i = 0; i < Math.round(6 / STEP); i++) {
    if (i % 24 === 0) { steer = Math.round(rnd() * 2 - 1); lk = rnd() > 0.7; }
    stepBike(b, steer, lk, STEP, C.solid);
    ok(!C.solid(b.x, b.y), 'scenario ' + seed + ' : velo dans un mur a l etape ' + i);
  }
}
