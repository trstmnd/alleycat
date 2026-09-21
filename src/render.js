// Rendu canvas 2D. Vue de dessus, nord en haut, comme une carte de coursier :
// la camera ne tourne jamais, sinon on n'apprend pas la ville.

import { CELL, COLS, ROWS, MAP, WORLD_W, WORLD_H } from './city.js';
import { PARCEL } from './parcel.js';

// Unites monde visibles au minimum sur le petit cote de l'ecran.
const VIEW_MIN = 620;

// Debordement autorise de la camera hors de la ville, en fraction d'ecran.
const EDGE_SLACK = 0.16;

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
  skidInk: '#05070b',
  // Clair, et surtout pas proche de la couleur de l'asphalte : le cadre se
  // detache sur le halo sombre, sinon on ne voit que le point du coursier.
  bike: '#a8bdd6'
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
  // Un velo vu de dessus, pas une fleche. Deux roues alignees sur le cadre
  // donnent la direction du cap ; comme le deplacement suit la trajectoire, la
  // derive se lit toute seule : le velo part de travers. La roue avant
  // contre-braque, ce que fait vraiment un pilote quand l'arriere decroche.
  function rider(g, x, y, heading, slip, color, alpha, halo, scale) {
    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    if (scale && scale !== 1) g.scale(scale, scale);
    if (halo) {
      g.fillStyle = 'rgba(0,0,0,.58)';
      g.beginPath();
      g.arc(0, 0, 17, 0, Math.PI * 2);
      g.fill();
    }
    g.rotate(heading);
    g.scale(1.15, 1.15);

    const wheel = (cx, angle) => {
      g.save();
      g.translate(cx, 0);
      g.rotate(angle);
      g.fillStyle = C.bike;
      g.fillRect(-5, -1.7, 10, 3.4);
      g.restore();
    };

    wheel(-9, 0);
    // Contre-braquage : la roue avant pointe a l'oppose du dérapage, comme un
    // pilote qui rattrape l'arriere. C'est le signe le plus lisible d'un skid.
    wheel(10, Math.max(-0.7, Math.min(0.7, -(slip || 0) * 0.9)));

    g.strokeStyle = C.bike;
    g.lineWidth = 2.4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-9, 0);
    g.lineTo(10, 0);
    g.stroke();

    // Le coursier vu de dessus : des epaules en travers du cadre, une tete.
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(-1, 0, 4.2, 5.8, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = color;
    g.beginPath();
    g.arc(3, 0, 2.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Les traces vivent dans leur propre calque, a l'echelle du monde. On y
  // ajoute chaque segment une seule fois au lieu de retracer tout l'historique
  // a chaque image : le cout par image devient constant, et les passages
  // repetes se superposent et noircissent, comme de vraies traces.
  const skidLayer = document.createElement('canvas');
  skidLayer.width = WORLD_W;
  skidLayer.height = WORLD_H;
  const sg = skidLayer.getContext('2d');
  sg.lineCap = 'round';
  sg.strokeStyle = C.skidInk;

  return {
    resize,

    // `force` va de 0 a 1 : une derive naissante laisse une trace pale et
    // fine, une roue bloquee laisse un trait noir et large.
    addSkid(x1, y1, x2, y2, force) {
      const f = Math.max(0, Math.min(1, force));
      sg.globalAlpha = 0.07 + 0.4 * f;
      sg.lineWidth = 2.6 + 2.6 * f;
      sg.beginPath();
      sg.moveTo(x1, y1);
      sg.lineTo(x2, y2);
      sg.stroke();
      sg.globalAlpha = 1;
    },

    clearSkids() { sg.clearRect(0, 0, WORLD_W, WORLD_H); },

    get width() { return w; },
    get height() { return h; },

    draw(state) {
      const { bike, target, parcels, flying, ghost, t } = state;

      // Zoom : a l'echelle du bureau, un telephone en portrait ne montrerait
      // qu'une dizaine de cases de large et la ville serait illisible. On
      // desserre jusqu'a voir au moins VIEW_MIN unites sur le petit cote, et
      // jamais au dela de 1 : on ne zoome pas dans la ville sur grand ecran.
      const zoom = Math.min(1, Math.min(w, h) / VIEW_MIN);
      const vw = w / zoom;
      const vh = h / zoom;

      // Camera : centree sur le velo, avec une avance dans le sens de la
      // marche pour voir venir, et bornee pour ne jamais sortir de la ville.
      const lead = Math.min(bike.speed, 200) * 0.45;
      // Sur petit ecran, les pouces occupent le bas de la dalle. On remonte le
      // coursier au tiers superieur pour qu'il ne roule pas sous les doigts.
      const thumbBias = zoom < 1 ? vh * 0.10 : 0;
      let cx = bike.x + Math.cos(bike.heading) * lead;
      let cy = bike.y + Math.sin(bike.heading) * lead + thumbBias;
      // La camera a le droit de deborder de la ville, jusqu'a EDGE_SLACK d'un
      // ecran. Verrouiller pile sur les bords collait le coursier au bas de la
      // dalle des le depart, qui est a deux cases du bord sud. Le hors ville
      // se remplit de la meme couleur que l'ombre des paves, ca ne se voit pas.
      const mx = vw * EDGE_SLACK;
      const my = vh * EDGE_SLACK;
      cx = Math.max(vw / 2 - mx, Math.min(WORLD_W - vw / 2 + mx, cx));
      cy = Math.max(vh / 2 - my, Math.min(WORLD_H - vh / 2 + my, cy));

      ctx.fillStyle = C.wall;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(Math.round(vw / 2 - cx), Math.round(vh / 2 - cy));

      ctx.drawImage(city, 0, 0);

      // Traces de dérapage, sous tout le reste
      ctx.drawImage(skidLayer, 0, 0);

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

      // Au dezoom le coursier grossit un peu pour rester trouvable, plafonne
      // pour qu'il ne mente pas trop sur sa boite de collision.
      const rs = Math.min(1.5, 1 / zoom);
      if (ghost) rider(ctx, ghost.x, ghost.y, ghost.heading, ghost.slip, C.ghost, 1, false, rs);
      rider(ctx, bike.x, bike.y, bike.heading, bike.slip, C.rider, 1, true, rs);

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
        const sx = (target.x - cx) * zoom + w / 2;
        const sy = (target.y - cy) * zoom + h / 2;
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
