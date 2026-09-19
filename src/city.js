// La ville : carte, collision, depots. Pur, sans DOM ni canvas.
// La carte est fixe et ecrite a la main : on ne peut apprendre une ville
// procedurale, et connaitre la ville est tout le sujet d'un alleycat.

export const CELL = 40;

// '#' pave, '.' chaussee
export const MAP = [
  '................................................',
  '................................................',
  '..#######..#######..################..#######...',
  '..#######..#######..################..#######...',
  '..#######..#######..################..#######...',
  '..#######..#######..################..#######...',
  '..#######..#######..################..#######...',
  '................................................',
  '................................................',
  '..#######.....####..#######..#######..#######...',
  '..#######.......##..#######..#######..#######...',
  '..#######..##....#..#######..#######..#######...',
  '..#######..####.....#######..#######..#######...',
  '..#######..#####....#######..#######..#######...',
  '......................................#######...',
  '......................................#######...',
  '..#######..#######.......##...........#######...',
  '..#######..#######..##....#...........#######...',
  '..#######..#######..###...............#######...',
  '..#######..#######..#####.............#######...',
  '..#######..#######..######............#######...',
  '................................................',
  '................................................',
  '..#######..#######..#######..#######..#######...',
  '..#######..#######..#######..#######..#######...',
  '..#######..#######..#######..#######..#######...',
  '..#######..#######..#######..#######..#######...',
  '..#######..#######..#######..#######..#######...',
  '................................................',
  '................................................',
  '................................................',
  '................................................',
];

export const COLS = 48;
export const ROWS = 32;
export const WORLD_W = COLS * CELL;
export const WORLD_H = ROWS * CELL;

// Depart et manifeste. Les coordonnees sont en cellules, converties en unites
// monde par `center()`. Toutes verifiees sur chaussee par check.sh.
// Cap est : le rang 30 est degage sur toute la largeur. Plein nord, on
// rentre dans un pave au bout de trois cases.
export const START = { cx: 2, cy: 30, heading: 0 };

export const DROPS = [
  { cx: 46, cy: 8, name: 'TOUR EST', street: 'quai de l\'Est' },
  { cx: 32, cy: 18, name: 'LA PLACE', street: 'esplanade' },
  { cx: 10, cy: 8, name: 'IMPRIMERIE', street: 'rue Nord' }
];

export function center(cell) {
  return { x: (cell.cx + 0.5) * CELL, y: (cell.cy + 0.5) * CELL };
}

export function cellAt(x, y) {
  return { cx: Math.floor(x / CELL), cy: Math.floor(y / CELL) };
}

// Hors carte compte comme un mur : la ville est close.
// NaN passe au travers de toute comparaison, donc sans ce garde une seule
// coordonnee invalide ferait lever une exception dans la boucle rAF et tuerait
// la page entiere. Solide est le repli sur : ca fige, ca ne casse pas.
export function solid(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return true;
  const cx = Math.floor(x / CELL);
  const cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return true;
  return MAP[cy][cx] === '#';
}
