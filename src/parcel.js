// Le colis : l'objet physique qu'on depose en roulant, jamais a l'arret.
// Pur, et surtout entierement deterministe : il n'obeit qu'a ton elan, aux
// murs et a la friction. Rien d'autre ne le pousse. C'est la condition pour
// qu'un restart instantane reste honnete.

export const PARCEL = {
  // Portee = (throwSpeed + carry * vitesse - stopAt) / friction.
  // A l'arret 41 unites, a pleine vitesse 146. L'elan compte plus que
  // l'impulsion propre, et c'est tout le sujet : au ralenti on pose le colis
  // devant la porte, a fond on le balance de 140 unites sans lever le pied.
  // Il faut que le lent reste possible, sinon on ne peut jamais rattraper un
  // rate ; il faut qu'il soit lent, sinon personne ne prend le risque.
  throwSpeed: 105, // impulsion propre au lancer
  carry: 1.15,     // part de l'elan du velo transmise au colis
  friction: 2.2,   // freinage par seconde
  stopAt: 14,      // sous cette vitesse, le colis se pose
  bounce: 0.45,    // restitution contre un mur
  radius: 6,
  zone: 34         // rayon de la zone de depot
};

export function throwParcel(bike) {
  const v = bike.speed * PARCEL.carry + PARCEL.throwSpeed;
  return {
    x: bike.x,
    y: bike.y,
    vx: Math.cos(bike.heading) * v,
    vy: Math.sin(bike.heading) * v,
    resting: false
  };
}

export function stepParcel(p, dt, solid) {
  if (p.resting) return p;

  const k = Math.max(0, 1 - PARCEL.friction * dt);
  p.vx *= k;
  p.vy *= k;

  const dx = p.vx * dt;
  const dy = p.vy * dt;
  const r = PARCEL.radius;

  if (solid(p.x + dx + Math.sign(dx) * r, p.y)) p.vx = -p.vx * PARCEL.bounce;
  else p.x += dx;

  if (solid(p.x, p.y + dy + Math.sign(dy) * r)) p.vy = -p.vy * PARCEL.bounce;
  else p.y += dy;

  if (Math.hypot(p.vx, p.vy) < PARCEL.stopAt) {
    p.vx = 0;
    p.vy = 0;
    p.resting = true;
  }
  return p;
}

export function inZone(p, target) {
  return Math.hypot(p.x - target.x, p.y - target.y) <= PARCEL.zone;
}
