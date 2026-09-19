import { ok, load } from './_ok.mjs';
const C = await load('city');

ok(C.MAP.length === C.ROWS, 'ROWS ne correspond pas a la carte');
ok(C.MAP.every((r) => r.length === C.COLS), 'lignes de longueur inegale');
ok(C.MAP.every((r) => /^[.#]+$/.test(r)), 'caractere inconnu dans la carte');

const road = (c) => C.MAP[c.cy][c.cx] === '.';
ok(road(C.START), 'le depart est dans un mur');
for (const d of C.DROPS) ok(road(d), 'depot ' + d.name + ' dans un mur');
ok(new Set(C.DROPS.map((d) => d.cx + ',' + d.cy)).size === C.DROPS.length, 'deux depots au meme endroit');

// Connexite : toute la chaussee doit etre atteignable depuis le depart, sinon
// un depot peut etre enferme et la course devient infaisable.
const seen = new Set([C.START.cx + ',' + C.START.cy]);
const q = [[C.START.cx, C.START.cy]];
while (q.length) {
  const [x, y] = q.pop();
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
    if (nx < 0 || ny < 0 || nx >= C.COLS || ny >= C.ROWS) continue;
    if (C.MAP[ny][nx] === '.' && !seen.has(k)) { seen.add(k); q.push([nx, ny]); }
  }
}
const total = C.MAP.join('').split('').filter((c) => c === '.').length;
ok(seen.size === total, 'chaussee non connexe : ' + seen.size + ' sur ' + total);
for (const d of C.DROPS) ok(seen.has(d.cx + ',' + d.cy), 'depot ' + d.name + ' inatteignable');

ok(C.solid(-1, 10) && C.solid(10, -1), 'hors carte devrait etre solide');
ok(C.solid(C.WORLD_W + 5, 10), 'au dela du bord devrait etre solide');
const s = C.center(C.START);
ok(!C.solid(s.x, s.y), 'le centre de la case de depart est solide');

// Une coordonnee invalide ne doit jamais lever : une exception dans la boucle
// rAF tuerait la page, pas seulement la course.
ok(C.solid(NaN, 10) && C.solid(10, NaN) && C.solid(Infinity, 10), 'NaN devrait etre solide');
