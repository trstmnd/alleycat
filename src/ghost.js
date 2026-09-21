// Enregistrement et rejeu du fantome. Echantillonnage a pas fixe : la boucle
// rAF a un dt variable, un fantome indexe sur les frames deriverait.
// Quatre valeurs par echantillon : position, cap, et angle de derive, pour que
// le fantome derape comme le coursier au lieu de glisser bien droit.

export const STEP = 1 / 30;
export const STRIDE = 4;

export function newRecorder() { return { samples: [], next: 0 }; }

export function record(rec, t, bike) {
  while (t >= rec.next) {
    rec.samples.push(bike.x, bike.y, bike.heading, bike.slip || 0);
    rec.next += STEP;
  }
}

// Position interpolee du fantome a l'instant t, ou null s'il a fini sa course.
export function sampleAt(samples, t) {
  if (!samples || samples.length < STRIDE * 2) return null;
  const n = samples.length / STRIDE;
  const f = t / STEP;
  const i = Math.floor(f);
  if (i >= n - 1 || i < 0) return null;
  const a = i * STRIDE;
  const u = f - i;
  const h0 = samples[a + 2];
  let dh = samples[a + STRIDE + 2] - h0;
  // Interpoler le cap par le plus court chemin, sinon le fantome fait un tour
  // complet chaque fois qu'il passe par pi.
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return {
    x: samples[a] + (samples[a + STRIDE] - samples[a]) * u,
    y: samples[a + 1] + (samples[a + STRIDE + 1] - samples[a + 1]) * u,
    heading: h0 + dh * u,
    slip: samples[a + 3] + (samples[a + STRIDE + 3] - samples[a + 3]) * u
  };
}
