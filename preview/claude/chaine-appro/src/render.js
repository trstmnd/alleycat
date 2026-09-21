// Rendu canvas 2D. Vue de dessus, nord en haut, comme une carte de coursier :
// la camera ne tourne jamais, sinon on n'apprend pas la ville.

import { CELL, COLS, ROWS, MAP, WORLD_W, WORLD_H } from './city.js';
import { PARCEL } from './parcel.js';

// Unites monde visibles au minimum sur le petit cote de l'ecran.
const VIEW_MIN = 620;

// Debordement autorise de la camera hors de la ville, en fraction d'ecran.
const EDGE_SLACK = 0.16;

// Quatre quartiers, un par quadrant de la ville. Tous sombres et desatures
// pour que la ville reste une ville de nuit et que le cyan du coursier
// continue de ressortir, mais assez distincts pour servir de reperes : sans
// minicarte, la couleur du quartier est ce qui dit ou on se trouve.
// A saturation egale, un violet ou un ocre pesent plus lourd a l'oeil qu'un
// bleu ou un cyan : les deux derniers sont baisses pour que les quatre
// quartiers aient le meme poids.
// La saturation reste basse : un toit large a 20 % de saturation devient une
// tache de couleur et casse la ville de nuit. La teinte se lit quand meme
// parce qu'elle couvre de grandes surfaces, et le lisere, fin, porte le reste.
const DISTRICTS = [
  { h: 218, s: 13 }, // nord-ouest : bleu ardoise
  { h: 192, s: 12 }, // nord-est : cyan sourd
  { h: 278, s: 8 },  // sud-ouest : violet sourd
  { h: 32, s: 9 }    // sud-est : pierre chaude
];

const C = {
  road: '#1b2130',
  roadLine: '#2a3346',
  sidewalk: '#252c3d',
  gutter: '#141926',
  paint: 'rgba(196,214,238,.16)',
  wall: '#0d1119',
  shadow: 'rgba(4,6,10,.55)',
  rider: '#6ee7ff',
  ghost: 'rgba(160,190,220,.34)',
  zone: '#7dffa8',
  parcel: '#ffcf5c',
  skidInk: '#05070b',
  // Clair, et surtout pas proche de la couleur de l'asphalte : le cadre se
  // detache sur le halo sombre, sinon on ne voit que le point du coursier.
  bike: '#a8bdd6'
};

const hsl = (h, s, l) => 'hsl(' + h + ',' + s.toFixed(1) + '%,' + l.toFixed(1) + '%)';

// Bruit deterministe sur une paire d'entiers. La ville doit etre identique
// d'une partie a l'autre, donc pas de Math.random ici non plus.
function hash2(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const isRoad = (cx, cy) =>
  cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && MAP[cy][cx] === '.';

// Un pave est une composante connexe de '#'. On les etiquette pour donner a
// chacun sa teinte et sa hauteur, au lieu de traiter chaque cellule isolement :
// sans ca un meme immeuble serait bariole cellule par cellule.
function labelBlocks() {
  const id = new Int16Array(COLS * ROWS).fill(-1);
  const blocks = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '#' || id[cy * COLS + cx] !== -1) continue;
      const n = blocks.length;
      const cells = [];
      const q = [[cx, cy]];
      id[cy * COLS + cx] = n;
      let sx = 0, sy = 0, minX = cx, minY = cy;
      while (q.length) {
        const [x, y] = q.pop();
        cells.push([x, y]);
        sx += x; sy += y;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          if (MAP[ny][nx] !== '#' || id[ny * COLS + nx] !== -1) continue;
          id[ny * COLS + nx] = n;
          q.push([nx, ny]);
        }
      }
      const gx = sx / cells.length, gy = sy / cells.length;
      const r = hash2(minX, minY);
      const d = DISTRICTS[(gx > COLS / 2 ? 1 : 0) + (gy > ROWS / 2 ? 2 : 0)];
      blocks.push({
        cells,
        // Variation de valeur par pave : c'est ce qui casse l'effet de dalles
        // grises identiques, pour trois lignes et zero cout par image.
        roof: hsl(d.h, d.s, 20.5 + r * 5.5),
        edge: hsl(d.h, d.s + 14, 34 + r * 6),
        // Hauteur fictive, qui ne sert qu'a la longueur de l'ombre portee.
        height: 6 + hash2(minY + 31, minX + 17) * 10
      });
    }
  }
  return blocks;
}
// La ville est dessinee une fois dans un canvas hors ecran, puis recopiee.
// Tout ce qui est ici coute zero par image : c'est la que va le budget.
function bakeCity() {
  const c = document.createElement('canvas');
  c.width = WORLD_W;
  c.height = WORLD_H;
  const g = c.getContext('2d');
  const blocks = labelBlocks();

  // 1. la chaussee
  g.fillStyle = C.road;
  g.fillRect(0, 0, WORLD_W, WORLD_H);

  // 2. plaques d'egout, semees de facon deterministe
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '.') continue;
      const r = hash2(cx + 101, cy + 7);
      if (r > 0.055) continue;
      g.fillStyle = C.gutter;
      g.beginPath();
      g.arc((cx + 0.3 + r * 7) * CELL, (cy + 0.35 + r * 5) * CELL, 3.6, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 3. trottoirs : une bande claire du cote chaussee de chaque pave, avec son
  // caniveau. C'est ce qui fait que la rue arrete d'etre un fond et devient
  // une rue.
  const SW = 7;
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '#') continue;
      const x = cx * CELL, y = cy * CELL;
      const band = (bx, by, bw, bh, gx, gy, gw, gh) => {
        g.fillStyle = C.sidewalk;
        g.fillRect(bx, by, bw, bh);
        g.fillStyle = C.gutter;
        g.fillRect(gx, gy, gw, gh);
      };
      if (isRoad(cx, cy - 1)) band(x, y - SW, CELL, SW, x, y - SW - 1.5, CELL, 1.5);
      if (isRoad(cx, cy + 1)) band(x, y + CELL, CELL, SW, x, y + CELL + SW, CELL, 1.5);
      if (isRoad(cx - 1, cy)) band(x - SW, y, SW, CELL, x - SW - 1.5, y, 1.5, CELL);
      if (isRoad(cx + 1, cy)) band(x + CELL, y, SW, CELL, x + CELL + SW, y, 1.5, CELL);
    }
  }

  // 4. marquage au sol : axe pointille dans les rues qui continuent tout
  // droit, passages pietons a l'entree des carrefours.
  const open = (cx, cy) => ({
    x: isRoad(cx - 1, cy) && isRoad(cx + 1, cy),
    y: isRoad(cx, cy - 1) && isRoad(cx, cy + 1)
  });
  const isOpenBoth = (cx, cy) => {
    if (!isRoad(cx, cy)) return false;
    const o = open(cx, cy);
    return o.x && o.y;
  };
  // Une zone ouverte dans les deux sens est soit un croisement de rues (petit),
  // soit une esplanade ou une avenue large (grande). Seules les petites
  // meritent un passage pieton : sinon toute l'avenue du bas se retrouve
  // pavee de zebrures.
  const MAX_CARREFOUR = 8;
  const crossId = new Int16Array(COLS * ROWS).fill(-1);
  const crossSize = [];
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (!isOpenBoth(cx, cy) || crossId[cy * COLS + cx] !== -1) continue;
      const n = crossSize.length;
      const q = [[cx, cy]];
      crossId[cy * COLS + cx] = n;
      let size = 0;
      while (q.length) {
        const [x, y] = q.pop();
        size++;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
          if (!isOpenBoth(nx, ny) || crossId[ny * COLS + nx] !== -1) continue;
          crossId[ny * COLS + nx] = n;
          q.push([nx, ny]);
        }
      }
      crossSize.push(size);
    }
  }
  const crossing = (cx, cy) => {
    if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return false;
    const id = crossId[cy * COLS + cx];
    return id !== -1 && crossSize[id] <= MAX_CARREFOUR;
  };

  g.strokeStyle = C.roadLine;
  g.lineWidth = 2;
  g.setLineDash([10, 14]);
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '.') continue;
      const o = open(cx, cy);
      // Les deux sens, pas seulement l'horizontal : les rues verticales
      // n'avaient aucun axe, la ville etait asymetrique sans raison.
      if (o.x && !o.y) {
        g.beginPath();
        g.moveTo(cx * CELL, cy * CELL + CELL / 2);
        g.lineTo(cx * CELL + CELL, cy * CELL + CELL / 2);
        g.stroke();
      } else if (o.y && !o.x) {
        g.beginPath();
        g.moveTo(cx * CELL + CELL / 2, cy * CELL);
        g.lineTo(cx * CELL + CELL / 2, cy * CELL + CELL);
        g.stroke();
      }
    }
  }
  g.setLineDash([]);

  g.fillStyle = C.paint;
  for (let cy = 0; cy < ROWS; cy++) {
    for (let cx = 0; cx < COLS; cx++) {
      if (MAP[cy][cx] !== '.' || crossing(cx, cy)) continue;
      const o = open(cx, cy);
      const touches = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => crossing(cx + dx, cy + dy));
      if (!touches) continue;
      const x = cx * CELL, y = cy * CELL;
      // Les barres d'un passage pieton barrent le sens de circulation.
      if (o.x && !o.y) for (let i = 0; i < 4; i++) g.fillRect(x + 4 + i * 9.5, y + 3, 5, CELL - 6);
      else if (o.y && !o.x) for (let i = 0; i < 4; i++) g.fillRect(x + 3, y + 4 + i * 9.5, CELL - 6, 5);
    }
  }

  // 5. les paves. Toutes les ombres d'abord, tous les toits ensuite : dans
  // l'ordre inverse, l'ombre d'un pave recouvrirait le toit de son voisin.
  for (const b of blocks) {
    const ox = b.height * 0.38, oy = b.height * 0.62;
    g.fillStyle = C.shadow;
    for (const [cx, cy] of b.cells) g.fillRect(cx * CELL + ox, cy * CELL + oy, CELL, CELL);
  }
  for (const b of blocks) {
    g.fillStyle = b.roof;
    for (const [cx, cy] of b.cells) g.fillRect(cx * CELL, cy * CELL, CELL, CELL);
  }
  // Lisere clair sur les aretes exposees a la lumiere, en haut et a gauche.
  for (const b of blocks) {
    g.fillStyle = b.edge;
    for (const [cx, cy] of b.cells) {
      const x = cx * CELL, y = cy * CELL;
      if (!isRoad(cx, cy - 1) && MAP[cy - 1] && MAP[cy - 1][cx] === '#') continue;
      g.fillRect(x, y, CELL, 2);
    }
    for (const [cx, cy] of b.cells) {
      const x = cx * CELL, y = cy * CELL;
      if (cx > 0 && MAP[cy][cx - 1] === '#') continue;
      g.fillRect(x, y, 2, CELL);
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
