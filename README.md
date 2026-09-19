# ALLEYCAT

Course de coursier a velo dans le navigateur, mobile comme ordinateur, **sans
installation, sans build, sans dependance**. Pas une seule ligne de code
chargee depuis un CDN.

**Jouer : https://trstmnd.github.io/alleycat/**

## Le principe

Tu recois un manifeste de trois depots. Pas de minicarte, pas d'itineraire, pas
de frein. Tu connais la ville ou tu la decouvres en la payant.

- **Fleches gauche et droite** pour diriger.
- **Espace** pour lancer le colis.
- **Maj**, ou les deux fleches ensemble, pour skider.
- **R** pour repartir immediatement.

Sur mobile : tiers gauche et tiers droit pour diriger, tiers central pour
lancer, les deux cotes ensemble pour skider.

## Ce qui rend le jeu different d'un time attack

**On ne s'arrete jamais a un depot, on y jette le colis en passant.** Le colis
part avec ton elan : plus tu arrives vite, plus il porte loin. S'il s'immobilise
dans la zone, c'est livre. S'il finit a cote, il reste par terre et tu dois
revenir le chercher, ce qui coute une boucle entiere.

C'est l'idee volee a Rocket League, mais **degrossie de son chaos** : le colis
n'obeit qu'a ton elan, aux murs et a la friction. Rien d'autre ne le pousse.
C'est ce qui permet de garder la boucle de Trackmania par dessus : restart
instantane, fantome de ton record, chasse aux medailles. Un time attack ne
supporte pas l'aleatoire, parce que le joueur doit pouvoir se dire que l'echec
etait entierement de sa faute.

## Ce qu'il faut savoir avant de toucher au code

- **La simulation tourne a pas fixe (`SIM_STEP`, 1/120 s), pas au rythme de
  `requestAnimationFrame`.** Simuler sur le dt de rAF rendrait la course
  dependante du taux de rafraichissement : un ecran 144 Hz ne jouerait pas le
  meme jeu qu'un 60 Hz, et le fantome mentirait.
- **La carte est ecrite a la main, jamais generee.** On ne peut pas apprendre
  une ville procedurale, et la connaitre est tout le sujet d'un alleycat.
- **La camera ne tourne jamais**, nord en haut, comme une carte de coursier.
  Une camera qui suit le cap est plus immersive et rend la ville inapprenable.
- **La boussole en bord d'ecran est une concession assumee de la v0.1.** Le
  jour ou la ville sera reellement apprenable, elle devient une option.
- **`file://` ne charge pas les modules ES.** Il faut un serveur.

## Demarrer

```bash
./check.sh                  # 38 controles, ni reseau ni navigateur
python3 -m http.server 8012 # puis http://localhost:8012/?cb=1
```

Le `?cb=<n>` n'est pas decoratif. Le serveur local n'envoie pas de
`Cache-Control`, Chrome sert alors l'ancien module ES et la modification semble
sans effet. Changer le `n` a chaque rechargement.

## Carte des fichiers

| Fichier | Role | Toucher quand |
|---|---|---|
| `index.html` | ecrans (title, race, end), HUD | on ajoute un ecran ou un element de HUD |
| `style.css` | tout le style, HUD et responsive compris | rendu 2D |
| `src/main.js` | machine d'etats, boucle rAF, pas fixe, HUD, sauvegarde, `VERSION` | flux de jeu, affichage, stockage |
| `src/city.js` | la carte, la collision, le manifeste. Pur | changer la ville ou les depots |
| `src/bike.js` | physique du velo. Pur, sans DOM | sensations de pilotage |
| `src/parcel.js` | physique du colis. Pur, sans DOM | equilibrage du lancer |
| `src/race.js` | chrono, manifeste, medailles. Pur | bareme |
| `src/ghost.js` | enregistrement et rejeu du fantome | fantome |
| `src/render.js` | rendu canvas 2D, camera, ville precalculee | rendu |
| `src/audio.js` | sons synthetises | son |
| `src/input.js` | clavier et tactile | controles |
| `tests/` | les regles testees sans navigateur, lancees par `check.sh` | toute regle de jeu |

Constantes de reglage : `BIKE` dans `src/bike.js`, `PARCEL` dans
`src/parcel.js`, `MEDALS` dans `src/race.js`, `MAP` et `DROPS` dans
`src/city.js`, `VERSION` et `SIM_STEP` dans `src/main.js`.

## Les medailles

Calibrees sur le chemin optimal mesure sur la carte (4880 unites, soit 30,5 s a
80 % de la vitesse maximale), pas au doigt mouille.

| Medaille | Temps |
|---|---|
| Auteur | 33 s |
| Or | 39 s |
| Argent | 47 s |
| Bronze | 60 s |

Repere mesure : un autopilote qui suit betement le chemin optimal, sans couper
un seul virage et sans jamais lever le pied, boucle le manifeste en **42,17 s**,
soit argent. Il lance ses trois colis a pleine vitesse depuis 134 a 156 unites.

**A retoucher des que des humains auront joue.** Un bareme calcule n'est pas un
bareme teste : il ignore le cout reel des lancers rates et de la memorisation
de la ville. Si personne n'approche l'or, c'est le bareme qu'il faut bouger,
pas le joueur.

## Versions

Le numero s'affiche sur l'ecran titre. Il vit dans `src/main.js`
(`export const VERSION`), un controle de `check.sh` verifie qu'il est bien la.

| Version | Ce qu'elle apporte |
|---|---|
| v0.1 | ville fixe, trois depots, lancer du colis, skid, fantome, medailles, records locaux |
| v0.2 | tient sur un telephone : zoom adaptatif, zones tactiles degagees |

## Publication

Le workflow `.github/workflows/pages.yml` publie a chaque push : `main` va a la
racine, toute autre branche va dans `preview/<branche>` sur `gh-pages`. Les
controles tournent avant, un `check.sh` rouge bloque la publication.

Une fois pour toutes : **Settings > Pages > Source** sur la branche `gh-pages`,
racine.
