// Physique du velo. Pur : aucune dependance, ni DOM ni canvas ni ville.
// La collision arrive par le callback `solid(x, y)`, ce qui rend ce module
// testable sans navigateur et sans carte.

export const BIKE = {
  // Calibre sur la ville, pas choisi au hasard : les rues font 80 unites,
  // donc le rayon de braquage doit descendre sous 60 en skid pour qu'un
  // virage passe, et rester au dessus de 90 a fond pour qu'il se merite.
  maxSpeed: 200,     // unites par seconde
  accel: 1.75,       // facteur asymptotique : on n'atteint jamais tout a fait le max
  turnBase: 3.8,     // rad/s a l'arret
  turnFalloff: 0.46, // ce que la vitesse retire au braquage
  scrub: 0.95,       // vitesse perdue a tourner, par seconde et par unite de braquage
  skidTurn: 1.75,    // braquage gagne en skid
  skidScrub: 2.5,    // vitesse perdue en skid
  skidMin: 0.5,      // sous cette fraction du max, le skid ne mord pas
  grazeKeep: 0.72,   // vitesse gardee en frottant un mur
  crashKeep: 0.14,   // vitesse gardee en le prenant de face
  stun: 0.38,        // secondes de pied a terre apres un mur de face
  radius: 7
};

export function newBike(x, y, heading) {
  return { x, y, heading, speed: 0, stun: 0, skid: false, hit: 0 };
}

// `steer` dans [-1, 1], `wantSkid` booleen, `dt` en secondes.
// Mute `b` et le renvoie. Entierement deterministe : aucun aleatoire, aucune
// lecture d'horloge. C'est cet invariant qui rend le restart instantane juste.
export function stepBike(b, steer, wantSkid, dt, solid) {
  steer = Math.max(-1, Math.min(1, steer));
  b.hit = 0;

  if (b.stun > 0) {
    // Pied a terre : on ne dirige plus et on ne relance pas.
    b.stun = Math.max(0, b.stun - dt);
    steer = 0;
  } else {
    b.speed += (BIKE.maxSpeed - b.speed) * BIKE.accel * dt;
  }

  const frac = b.speed / BIKE.maxSpeed;
  b.skid = !!wantSkid && frac > BIKE.skidMin && Math.abs(steer) > 0.1;

  let turn = BIKE.turnBase * (1 - BIKE.turnFalloff * frac) * steer;
  let scrub = BIKE.scrub;
  if (b.skid) { turn *= BIKE.skidTurn; scrub *= BIKE.skidScrub; }

  b.heading += turn * dt;
  b.speed -= Math.abs(steer) * b.speed * scrub * dt;
  if (b.speed < 0) b.speed = 0;

  const dx = Math.cos(b.heading) * b.speed * dt;
  const dy = Math.sin(b.heading) * b.speed * dt;
  const r = BIKE.radius;

  // Collision axe par axe : bloque sur un seul axe, on glisse le long du mur.
  // Bloque sur les deux, on l'a pris de face et on pose le pied.
  const bx = solid(b.x + dx + Math.sign(dx) * r, b.y);
  const by = solid(b.x, b.y + dy + Math.sign(dy) * r);
  if (!bx) b.x += dx;
  if (!by) b.y += dy;

  if (bx && by) {
    b.speed *= BIKE.crashKeep;
    b.stun = BIKE.stun;
    b.hit = 2;
  } else if (bx || by) {
    b.speed *= BIKE.grazeKeep;
    b.hit = 1;
  }
  return b;
}
