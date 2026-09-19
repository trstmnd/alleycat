// Petit harnais : aucune dependance, sortie non nulle au premier echec.
export function ok(cond, msg) { if (!cond) { console.error('    ' + msg); process.exit(1); } }
export const SRC = process.env.SRC;
export const load = (m) => import(SRC + '/' + m + '.mjs');
// PRNG deterministe : les scenarios aleatoires doivent etre rejouables.
export function lcg(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
