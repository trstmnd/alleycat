// Etat de course : manifeste, chrono, medailles. Pur, sans DOM.

// Calibre sur le chemin optimal de la carte (4880 unites) a 200 u/s : une
// ligne parfaite tient 30,5 s, un bon run 36 s.
// A retoucher des que des humains auront joue.
export const MEDALS = [
  { key: 'auteur', label: 'AUTEUR', time: 33 },
  { key: 'or', label: 'OR', time: 39 },
  { key: 'argent', label: 'ARGENT', time: 47 },
  { key: 'bronze', label: 'BRONZE', time: 60 }
];

export function newRace(dropCount) {
  return { leg: 0, total: dropCount, t: 0, done: false, splits: [] };
}

export function deliver(race) {
  race.splits.push(race.t);
  race.leg += 1;
  if (race.leg >= race.total) race.done = true;
  return race;
}

// MEDALS va du plus dur au plus facile : la premiere qui tombe est la bonne.
// Parcourir jusqu'au bout rendrait toujours le bronze.
export function medalFor(t) {
  for (const m of MEDALS) if (t <= m.time) return m;
  return null;
}

export function fmt(t) {
  const s = Math.floor(t);
  const cs = Math.floor((t - s) * 100);
  return String(s).padStart(2, '0') + "'" + String(cs).padStart(2, '0');
}
