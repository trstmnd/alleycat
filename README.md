# ALLEYCAT

Course de coursier a velo dans le navigateur, mobile comme ordinateur, **sans
installation, sans build, sans dependance**. Pas une seule ligne de code
chargee depuis un CDN.

**Jouer : https://trstmnd.github.io/alleycat/**

## D'ou vient le nom

`Alley cat`, le chat de gouttiere : l'errant qui rode dans les ruelles,
debrouillard, sans maitre, qui passe la ou personne ne passe.

Un alleycat est une course sauvage de coursiers a velo, non homologuee, dans la
circulation reelle. Nee dans le milieu des messagers de Toronto, en 1989, avec
une course appelee l'Alleycat Scramble. C'est une parodie de journee de travail :
un manifeste d'adresses, aucun itineraire fourni, un tampon a chaque checkpoint,
premier arrive premier servi. Deux marqueurs culturels : la **spoke card**
glissee dans les rayons, et le **pignon fixe sans frein**.

Les choix de ce jeu ne sont pas des libertes prises avec le format, ils le
decrivent : pas de minicarte parce que connaitre la ville est la competence, un
manifeste de trois depots, pas de frein, et on ne pose pas le pied.

## Le principe

Tu recois un manifeste de trois depots. Pas de minicarte, pas d'itineraire, pas
de frein. Tu connais la ville ou tu la decouvres en la payant.

- **Fleches gauche et droite** pour diriger.
- **Espace** pour lancer le colis.
- **Maj**, ou les deux fleches ensemble, pour skider.
- **R** pour repartir immediatement.

Sur mobile : tiers gauche et tiers droit pour diriger, tiers central pour
lancer, les deux cotes ensemble pour skider.

## Les quartiers

La ville est decoupee en quatre quartiers, un par quadrant, qui ont chacun leur
teinte : bleu ardoise, cyan sourd, violet, pierre chaude. La saturation reste
tres basse pour que ca reste une ville de nuit, mais les grandes surfaces
suffisent a rendre la teinte lisible.

Ce n'est pas de la decoration : **sans minicarte, la couleur du quartier est ce
qui dit ou on se trouve.** C'est le premier repere qu'on apprend.

## Le dérapage

Un fixie n'a pas de frein. Le seul moyen de ralentir est de bloquer les jambes
et de faire glisser le pneu arriere. Le jeu prend ca au pied de la lettre :
**le cap du velo et sa trajectoire reelle sont deux choses differentes**, et
leur ecart est l'angle de derive.

- En adherence, les deux se confondent presque : le velo va ou il pointe.
- **Quand braquage x vitesse depasse ce que le pneu tient, l'arriere part tout
  seul.** Pas besoin d'appuyer sur quoi que ce soit : un virage trop sec a plus
  de la moitie de la vitesse maximale derape, et c'est tout.
- Le bouton de skid bloque la roue volontairement. Il sert dans les virages qui
  tiendraient tout seuls, pour casser l'adherence quand on le decide.
- Plus l'angle est ouvert, plus on ralentit. Le dérapage n'est pas une punition,
  c'est le frein.

A l'ecran, rien n'est simule en plus : le velo est dessine selon son cap pendant
qu'il se deplace selon sa trajectoire, donc il part de travers tout seul. La roue
avant contre-braque, et la trace noire part de la roue arriere, pas du centre.

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

## Ou va le budget graphique

Mesure faite : 16,7 ms de frame mediane, p99 a 16,8, sur ordinateur comme sur
telephone. Le jeu est colle a 60 images par seconde et consomme une fraction de
pour cent de son budget. Il n'y a rien a optimiser.

En revanche **`bakeCity()` ne tourne qu'une fois**, au demarrage. Tout ce qui y
est dessine coute exactement zero par image. Les trottoirs, le marquage au sol,
les plaques d'egout, les teintes de quartier et les ombres portees sont tous la.
C'est le bon endroit pour depenser : a chaque fois qu'un detail peut y aller
plutot que dans la boucle de rendu, il doit y aller.

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
| v0.4 | la ville a une matiere : quartiers colores, trottoirs, marquage au sol, ombres portees |
| v0.3 | dérapage de fixie : cap et trajectoire dissocies, decrochage en virage sec, traces depuis la roue arriere |

## Publication

Le workflow `.github/workflows/pages.yml` publie a chaque push : `main` va a la
racine, toute autre branche va dans `preview/<branche>` sur `gh-pages`. Les
controles tournent avant, un `check.sh` rouge bloque la publication.

Une fois pour toutes : **Settings > Pages > Source** sur la branche `gh-pages`,
racine.
