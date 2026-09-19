// Controles. Clavier : fleches ou QD pour diriger, Espace pour lancer le colis,
// Maj ou les deux directions ensemble pour skider, R pour repartir.
// Tactile : tiers gauche et tiers droit pour diriger, tiers central pour
// lancer, les deux tiers exterieurs ensemble pour skider.

export function newInput() {
  return { left: false, right: false, shift: false, steer: 0, skid: false, throwEdge: false, restart: false };
}

function refresh(s) {
  s.steer = (s.right ? 1 : 0) - (s.left ? 1 : 0);
  // Les deux directions a la fois, c'est le skid : sur mobile ce sont deux
  // pouces, au clavier c'est le geste qu'on fait naturellement pour freiner.
  s.skid = s.shift || (s.left && s.right);
  if (s.left && s.right) s.steer = s.lastSteer || 0;
  else if (s.steer !== 0) s.lastSteer = s.steer;
}

export function install(state, canvas) {
  const key = (e, down) => {
    const c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA' || c === 'KeyQ') state.left = down;
    else if (c === 'ArrowRight' || c === 'KeyD') state.right = down;
    else if (c === 'ShiftLeft' || c === 'ShiftRight' || c === 'ArrowDown') state.shift = down;
    else if (c === 'Space') { if (down) state.throwEdge = true; }
    else if (c === 'KeyR') { if (down) state.restart = true; }
    else return;
    e.preventDefault();
    refresh(state);
  };
  addEventListener('keydown', (e) => key(e, true));
  addEventListener('keyup', (e) => key(e, false));

  const touches = new Map();
  const zone = (x) => (x < innerWidth / 3 ? 'left' : x > (innerWidth * 2) / 3 ? 'right' : 'throw');
  const apply = () => {
    const z = new Set(touches.values());
    state.left = z.has('left');
    state.right = z.has('right');
    refresh(state);
  };
  canvas.addEventListener('pointerdown', (e) => {
    const z = zone(e.clientX);
    if (z === 'throw') state.throwEdge = true;
    else { touches.set(e.pointerId, z); apply(); }
    e.preventDefault();
  });
  const up = (e) => { touches.delete(e.pointerId); apply(); };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
}
