import { ok, load, lcg } from './_ok.mjs';
const { throwParcel, stepParcel, inZone, PARCEL } = await load('parcel');
const { newBike } = await load('bike');
const C = await load('city');
const STEP = 1 / 120;
const open = () => false;

const settle = (p, solid) => {
  let n = 0;
  while (!p.resting && n++ < 4000) stepParcel(p, STEP, solid);
  return { p, n };
};

// Le colis se pose toujours, et vite : sinon la course ne se termine jamais
const b = newBike(400, 400, 0);
b.speed = 265;
const r = settle(throwParcel(b), open);
ok(r.p.resting, 'le colis ne se pose jamais');
ok(r.n < 600, 'le colis met trop longtemps a se poser : ' + r.n + ' pas');

// Plus on va vite, plus le colis part loin : le lancer recompense l elan
const far = (speed) => {
  const k = newBike(400, 400, 0);
  k.speed = speed;
  const p = settle(throwParcel(k), open).p;
  return p.x - 400;
};
ok(far(250) > far(60) + 20, 'la vitesse du velo ne porte pas le colis');

// Determinisme : deux lancers identiques finissent au meme endroit
const one = settle(throwParcel(Object.assign(newBike(400, 400, 0.7), { speed: 180 })), C.solid).p;
const two = settle(throwParcel(Object.assign(newBike(400, 400, 0.7), { speed: 180 })), C.solid).p;
ok(one.x === two.x && one.y === two.y, 'le lancer n est pas deterministe');

// Le colis ne traverse jamais un mur, quel que soit le cap
for (let seed = 1; seed <= 24; seed++) {
  const rnd = lcg(seed * 104729);
  const st = C.center(C.START);
  const k = newBike(st.x + 20, st.y - 20, rnd() * Math.PI * 2);
  k.speed = 80 + rnd() * 185;
  const p = settle(throwParcel(k), C.solid).p;
  ok(p.resting, 'cap ' + seed + ' : colis jamais pose');
  ok(!C.solid(p.x, p.y), 'cap ' + seed + ' : colis pose dans un mur');
}

// La zone de depot est bien un cercle de rayon PARCEL.zone
const c = { x: 500, y: 500 };
ok(inZone({ x: 500, y: 500 + PARCEL.zone - 1 }, c), 'zone trop petite');
ok(!inZone({ x: 500, y: 500 + PARCEL.zone + 1 }, c), 'zone trop grande');
