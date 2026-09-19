import { ok, load, lcg } from './_ok.mjs';
const { newBike, stepBike, BIKE } = await load('bike');
const C = await load('city');
const STEP = 1 / 120;
const open = () => false;

const run = (b, sec, steer, skid, solid) => {
  for (let i = 0; i < Math.round(sec / STEP); i++) stepBike(b, steer, skid, STEP, solid);
  return b;
};

// Ligne droite : on approche le max sans jamais le depasser
const a = run(newBike(100, 100, 0), 4, 0, false, open);
ok(a.speed <= BIKE.maxSpeed + 1e-9, 'vitesse au dessus du max');
ok(a.speed > BIKE.maxSpeed * 0.9, 'trop lent en ligne droite : ' + a.speed);

// Tourner coute de la vitesse : c'est tout le sujet du jeu
const t = run(newBike(100, 100, 0), 4, 1, false, open);
ok(t.speed < a.speed * 0.9, 'tourner ne coute pas assez : ' + t.speed + ' contre ' + a.speed);

// Le skid braque plus court et coute plus cher
const noSkid = run(newBike(100, 100, 0), 2.5, 1, false, open);
const skid = run(newBike(100, 100, 0), 2.5, 1, true, open);
ok(Math.abs(skid.heading) > Math.abs(noSkid.heading), 'le skid ne braque pas plus court');
ok(skid.speed < noSkid.speed, 'le skid ne coute rien');

// Le mur de face pose le pied, et on ne relance pas pendant le pied a terre
const wall = (x) => x > 300;
const hit = run(newBike(100, 100, 0), 4, 0, false, (x) => wall(x));
ok(hit.stun > 0 || hit.speed < BIKE.maxSpeed * 0.5, 'le mur n a pas arrete le velo');
const stunned = newBike(100, 100, 0);
stunned.speed = 200; stunned.stun = 0.3;
const before = stunned.speed;
stepBike(stunned, 0, false, STEP, open);
ok(stunned.speed <= before + 1e-9, 'on relance pendant le pied a terre');

// Invariant dur : quoi qu on fasse, le velo ne finit jamais dans un mur.
// 12 scenarios rejouables, 6 s chacun, entrees tirees d un PRNG deterministe.
for (let seed = 1; seed <= 12; seed++) {
  const rnd = lcg(seed * 7919);
  const st = C.center(C.START);
  const b = newBike(st.x, st.y, C.START.heading);
  let steer = 0, sk = false;
  for (let i = 0; i < Math.round(6 / STEP); i++) {
    if (i % 24 === 0) { steer = Math.round(rnd() * 2 - 1); sk = rnd() > 0.7; }
    stepBike(b, steer, sk, STEP, C.solid);
    ok(!C.solid(b.x, b.y), 'scenario ' + seed + ' : velo dans un mur a l etape ' + i);
  }
}
