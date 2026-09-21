// Physique du velo. Pur : aucune dependance, ni DOM ni canvas ni ville.
// La collision arrive par le callback `solid(x, y)`, ce qui rend ce module
// testable sans navigateur et sans carte.
//
// Le modele tient en une idee : le cap (`heading`, ou le velo pointe) et la
// trajectoire (`course`, ou il va vraiment) sont deux angles differents. Leur
// ecart est l'angle de derive, `slip`. En adherence la trajectoire rattrape le
// cap presque instantanement et les deux se confondent. Quand le pneu arriere
// decroche, elle traine derriere et l'angle s'ouvre : c'est le dérapage, et il
// se voit a l'ecran sans rien ajouter, puisque le velo est dessine selon son
// cap pendant qu'il se deplace selon sa trajectoire.

export const BIKE = {
  maxSpeed: 200,     // unites par seconde
  accel: 1.75,       // facteur asymptotique : on n'atteint jamais tout a fait le max

  // Braquage. Les rues font 80 unites, donc le rayon doit tenir dedans.
  turnBase: 3.8,     // rad/s a l'arret
  turnFalloff: 0.46, // ce que la vitesse retire au braquage

  // Adherence. `gripLimit` est l'acceleration laterale que le pneu arriere
  // encaisse avant de partir : au dela de braquage x vitesse, il decroche tout
  // seul. C'est ce qui fait qu'un virage trop sec derape sans rien demander.
  // A fond (braquage 2,05 rad/s x 200) on demande 410 : ca part. A 50 % on
  // demande 293 : ca tient tout juste. La limite tombe donc vers 55 % du max.
  gripLimit: 300,

  // Vitesse a laquelle la trajectoire rattrape le cap, en rad/s d'approche
  // exponentielle. Plus c'est bas, plus l'angle de derive s'ouvre.
  gripSnap: 16,      // en adherence : quasi immediat, reste un leger angle de courbe
  slideSnap: 2.6,    // decrochage subi
  lockSnap: 1.5,     // roue arriere bloquee volontairement, le skid stop du fixie

  maxSlip: 0.55,     // angle de derive maximal, en radians (environ 31 degres)

  // Un fixie n'a pas de frein : le seul moyen de ralentir est de faire glisser
  // le pneu arriere. Le cout en vitesse est donc proportionnel a la derive, pas
  // au braquage. C'est ce qui rend le dérapage utile au lieu d'etre une punition.
  slipScrub: 1.7,
  rollScrub: 0.25,   // resistance au roulement en courbe, tres en dessous

  lockMin: 0.35,     // sous cette fraction de vitesse, bloquer ne decroche rien
  grazeKeep: 0.72,   // vitesse gardee en frottant un mur
  crashKeep: 0.14,   // vitesse gardee en le prenant de face
  stun: 0.38,        // secondes de pied a terre apres un mur de face
  radius: 7,
  wheelBase: 9       // du centre a la roue arriere, pour l'origine des traces
};

export function newBike(x, y, heading) {
  return {
    x, y,
    heading,          // ou le velo pointe
    course: heading,  // ou il va reellement
    slip: 0,          // l'ecart entre les deux : l'angle de derive
    speed: 0,
    stun: 0,
    sliding: false,   // le pneu arriere glisse, subi ou volontaire
    locked: false,    // roue arriere bloquee a la demande du joueur
    hit: 0
  };
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Position de la roue arriere, d'ou partent les traces de dérapage.
export function rearWheel(b) {
  return {
    x: b.x - Math.cos(b.heading) * BIKE.wheelBase,
    y: b.y - Math.sin(b.heading) * BIKE.wheelBase
  };
}

// `steer` dans [-1, 1], `wantLock` booleen, `dt` en secondes.
// Mute `b` et le renvoie. Entierement deterministe : aucun aleatoire, aucune
// lecture d'horloge. C'est cet invariant qui rend le restart instantane juste.
export function stepBike(b, steer, wantLock, dt, solid) {
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
  const turn = BIKE.turnBase * (1 - BIKE.turnFalloff * frac) * steer;
  b.heading = wrapAngle(b.heading + turn * dt);

  // Decrochage : volontaire, ou subi quand on demande au pneu plus que ce
  // qu'il tient. Les deux ouvrent l'angle, le volontaire l'ouvre plus.
  b.locked = !!wantLock && frac > BIKE.lockMin;
  b.sliding = b.locked || Math.abs(turn) * b.speed > BIKE.gripLimit;

  const snap = b.locked ? BIKE.lockSnap : b.sliding ? BIKE.slideSnap : BIKE.gripSnap;
  // Approche exponentielle, donc independante du pas de temps : a 1/120 s
  // comme a 1/60 s, la trajectoire rattrape le cap au meme rythme reel.
  const pull = 1 - Math.exp(-snap * dt);
  b.course = wrapAngle(b.course + wrapAngle(b.heading - b.course) * pull);

  let slip = wrapAngle(b.heading - b.course);
  if (Math.abs(slip) > BIKE.maxSlip) {
    slip = Math.sign(slip) * BIKE.maxSlip;
    b.course = wrapAngle(b.heading - slip);
  }
  b.slip = slip;

  // Le pneu qui glisse est le seul frein du velo.
  b.speed -= Math.abs(slip) * b.speed * BIKE.slipScrub * dt;
  b.speed -= Math.abs(steer) * b.speed * BIKE.rollScrub * dt;
  if (b.speed < 0) b.speed = 0;

  // On avance selon la trajectoire, pas selon le cap. Toute la difference.
  const dx = Math.cos(b.course) * b.speed * dt;
  const dy = Math.sin(b.course) * b.speed * dt;
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
    // Un mur de face remet le velo dans l'axe : plus rien ne glisse.
    b.course = b.heading;
    b.slip = 0;
    b.sliding = false;
    b.hit = 2;
  } else if (bx || by) {
    b.speed *= BIKE.grazeKeep;
    b.hit = 1;
  }
  return b;
}
