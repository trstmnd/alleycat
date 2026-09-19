import { ok, load } from './_ok.mjs';
const R = await load('race');

// Les medailles vont du plus dur au plus facile, sans egalite
for (let i = 1; i < R.MEDALS.length; i++) {
  ok(R.MEDALS[i].time > R.MEDALS[i - 1].time, 'medailles mal ordonnees');
}
ok(R.medalFor(R.MEDALS[0].time - 1).key === R.MEDALS[0].key, 'le meilleur temps ne donne pas la meilleure medaille');
ok(R.medalFor(R.MEDALS[R.MEDALS.length - 1].time + 1) === null, 'hors delai devrait ne rien donner');

// Une course se termine exactement au dernier depot, pas avant
const r = R.newRace(3);
ok(!r.done, 'course finie au depart');
R.deliver(r); ok(!r.done && r.leg === 1, 'premier depot');
R.deliver(r); ok(!r.done && r.leg === 2, 'deuxieme depot');
R.deliver(r); ok(r.done && r.splits.length === 3, 'la course ne se termine pas au dernier depot');

ok(R.fmt(0) === "00'00", 'format du chrono : ' + R.fmt(0));
ok(R.fmt(12.34).startsWith("12'3"), 'format du chrono : ' + R.fmt(12.34));
