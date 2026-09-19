// Rendu canvas 2D. Vue de dessus, nord en haut, comme une carte de coursier :
// la camera ne tourne jamais, sinon on n'apprend pas la ville.

import { CELL, COLS, ROWS, MAP, WORLD_W, WORLD_H } from './city.js';
import { PARCEL } from './parcel.js';

const C = {
  road: '#1b2130',
  roadLine: '#2a3346',
  wall: '#0d1119',
  wallTop: '#2b3448',
  wallEdge: '#39455e',
  rider: '#6ee7ff',
  ghost: 'rgba(160,190,220,.34)',
  zone: '#7dffa8',
  parcel: '#ffcf5c',
  skid: 'rgba(0,0,0,.42)'
};

// La ville est dessinee une fois dans un canvas hors ecran, puis recopiee.
// 1536 cellules redessinees a chaque frame couteraient cher pour rien.
function bakeCity() {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = WORLD_H;
  const g = c.getContext('2d');

  g.fillStyle = C.road;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  g.strokeStyle = C.roadLine;
  g.lineWidth = 2;
  g.setLineDash([10, 14]);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] === '#') continue;
      // Un axe pointille au milieu des chaussees, seulement la ou la rue
      // continue : les carrefours et les ruelles restent nus.
      const openX = MAP[cy][cx - 1] === '.' && MAP[cy][cx + 1] === '.';
      const openY = cy > 0 && cy < ROWS - 1 && MAP[cy - 1][cx] === '.' && MAP[cy + 1][cx] === '.';
      if (openX && !openY) {
        g.beginPath();
        g.moveTo(cx * CELL, cy * CELL + CELL / 2);
        g.lineTo(cx * CELL + CELL, cy * CELL + CELL / 2);
        g.stroke();
      }
    }
  }
  g.setLineDash([]);

  // Les paves : une base sombre decalee fait l'ombre portee, la face claire
  // par dessus donne le relief sans passer en 3D.
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '#') continue;
      const x = cx * CELL, y = cy * CELL;
      g.fillStyle = C.wall;
      g.fillRect(x, y + 7, CELL, CELL);
      g.fillStyle = C.wallTop;
      g.fillRect(x, y, CELL, CELL);
    }
  }
  // Le lisere clair uniquement sur les bords exterieurs des paves
  g.fillStyle = C.wallEdge;
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '#') continue;
      const x = cx * CELL, y = cy * CELL;
      if (cy === 0 || MAP[cy - 1][cx] === '.') g.fillRect(x, y, CELL, 2);
      if (cx === 0 || MAP[cy][cx - 1] === '.') g.fillRect(x, y, 2, CELL);
      if (cx === COLS - 1 || MAP[cy][cx + 1] === '.') g.fillRect(x + CELL - 2, y, 2, CELL);
    }
  }
  return c;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const city = bakeCity();
  let w = 0, h = 0;

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = innerWidth;
    h = innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener('resize', resize);
  resize();

  // Le coursier doit rester trouvable d'un coup d'oeil sur une ville sombre et
  // dense : un halo noir dessous, une fleche vive dessus, et une taille qui ne
  // depend pas de l'echelle de la ville.
  function rider(g, x, y, heading, color, alpha, halo) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    if (halo) {
      g.fillStyle = 'rgba(0,0,0,.5)';
      g.beginPath();
      g.arc(0, 0, 13, 0, Math.PI * 2);
      g.fill();
    }
    g.rotate(heading);
    g.beginPath();
    g.moveTo(15, 0);
    g.lineTo(-9, -7.5);
    g.lineTo(-5, 0);
    g.lineTo(-9, 7.5);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    if (halo) {
      g.lineWidth = 1.6;
      g.strokeStyle = 'rgba(8,14,24,.9)';
      g.stroke();
    }
    g.restore();
  }

  return {
    resize,
    get width() { return w; },
    get height() { return h; },

    draw(state) {
      const { bike, target, parcels, flying, skids, ghost, t } = state;

      // Camera : centree sur le velo, avec une avance dans le sens de la
      // marche pour voir venir, et bornee pour ne jamais sortir de la ville.
      const lead = Math.min(bike.speed, 265) * 0.45;
      let cx = bike.x + Math.cos(bike.heading) * lead;
      let cy = bike.y + Math.sin(bike.heading) * lead;
      cx = Math.max(w / 2, Math.min(WORLD_W - w / 2, cx));
      cy = Math.max(h / 2, Math.min(WORLD_H - h / 2, cy));
      if (WORLD_W < w) cx = WORLD_W / 2;
      if (WORLD_H < h) cy = WORLD_H / 2;

      ctx.fillStyle = C.wall;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(Math.round(w / 2 - cx), Math.round(h / 2 - cy));

      ctx.drawImage(city, 0, 0);

      // Traces de skid, sous tout le reste
      ctx.strokeStyle = C.skid;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const s of skids) {
        ctx.moveTo(s[0], s[1]);
        ctx.lineTo(s[2], s[3]);
      }
      ctx.stroke();

      // Zone de depot courante
      if (target) {
        const pulse = 0.55 + 0.45 * Math.sin(t * 4);
        ctx.strokeStyle = C.zone;
        ctx.globalAlpha = 0.35 + 0.35 * pulse;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(target.x, target.y, PARCEL.zone, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.1 + 0.08 * pulse;
        ctx.fillStyle = C.zone;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Colis poses : livres ou tombes a cote
      for (const p of parcels) {
        ctx.fillStyle = p.ok ? C.zone : C.parcel;
        ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
      }

      if (ghost) rider(ctx, ghost.x, ghost.y, ghost.heading, C.ghost, 1, false);
      rider(ctx, bike.x, bike.y, bike.heading, C.rider, 1, true);

      if (flying) {
        ctx.fillStyle = C.parcel;
        ctx.save();
        ctx.translate(flying.x, flying.y);
        ctx.rotate(t * 9);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
      }

      ctx.restore();

      // Boussole : une fleche en bord d'ecran vers le depot courant. C'est la
      // concession assumee de la v0.1, la ville n'a pas encore ete apprise.
      if (target) {
        const sx = target.x - cx + w / 2;
        const sy = target.y - cy + h / 2;
        const m = 54;
        if (sx < m || sx > w - m || sy < m || sy > h - m) {
          const a = Math.atan2(sy - h / 2, sx - w / 2);
          const px = w / 2 + Math.cos(a) * Math.min(w, h) * 0.38;
          const py = h / 2 + Math.sin(a) * Math.min(w, h) * 0.38;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(a);
          ctx.fillStyle = C.zone;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.moveTo(14, 0);
          ctx.lineTo(-8, -9);
          ctx.lineTo(-8, 9);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      }
    }
  };
}
