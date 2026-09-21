# AGENTS.md

Contexte compact d'ALLEYCAT pour un agent de code. Lire ce fichier suffit pour
commencer : il evite d'ouvrir les 9 modules pour comprendre le projet.

## Ce que c'est

Course de coursier a velo, vue de dessus, navigateur, zero build, **zero
dependance, y compris distante** : pas de CDN, pas d'importmap, rien que du
canvas 2D et des modules ES. Aucun asset binaire, tout est dessine en code.

Publie sur https://trstmnd.github.io/alleycat/ par le workflow
`.github/workflows/pages.yml` : `main` va a la racine, toute autre branche va
dans `preview/<branche>` sur `gh-pages`.

Le melange : la boucle de Trackmania (restart instantane, fantome, medailles)
plus un objet physique a poser avec son elan, emprunte a Rocket League mais
rendu deterministe.

## Carte des fichiers

| Fichier | Role | Toucher quand |
|---|---|---|
| `index.html` | ecrans (title, race, end), HUD | on ajoute un ecran ou un element de HUD |
| `style.css` | tout le style, HUD et responsive compris | rendu 2D |
| `src/main.js` | machine d'etats, boucle rAF, pas fixe, HUD, sauvegarde, `VERSION` | flux de jeu, affichage, stockage |
| `src/city.js` | carte, collision, manifeste. Pur | changer la ville ou les depots |
| `src/bike.js` | physique du velo. Pur | sensations de pilotage |
| `src/parcel.js` | physique du colis. Pur | equilibrage du lancer |
| `src/race.js` | chrono, manifeste, medailles. Pur | bareme |
| `src/ghost.js` | enregistrement et rejeu du fantome | fantome |
| `src/render.js` | canvas 2D, camera, ville precalculee | rendu |
| `src/audio.js` | sons synthetises | son |
| `src/input.js` | clavier et tactile | controles |
| `tests/*.mjs` | les regles testees sans navigateur | toute regle de jeu |

Constantes de reglage : `BIKE` (dont `gripLimit`, `gripSnap`, `slideSnap`,
`lockSnap`, `maxSlip`, `slipScrub`), `PARCEL`, `MEDALS`, `MAP` et `DROPS`,
`VERSION` et `SIM_STEP`.

## Invariants a ne pas casser

1. **La simulation tourne a pas fixe, `SIM_STEP` = 1/120 s.** Jamais sur le dt
   de `requestAnimationFrame`. Sinon un ecran 144 Hz ne joue pas le meme jeu
   qu'un 60 Hz et le fantome ment. C'est l'invariant qui porte tout le reste.
2. **Le cap et la trajectoire sont deux angles differents.** `heading` est ou
   le velo pointe, `course` ou il va, et `slip` est leur ecart : l'angle de
   derive. Le deplacement suit `course`, jamais `heading`. C'est ce qui fait
   exister le dérapage, et c'est ce qui le rend visible sans une seule ligne
   de code de rendu en plus, puisque le velo est dessine selon son cap
   pendant qu'il se deplace de travers. Recabler le deplacement sur `heading`
   supprimerait le dérapage tout en gardant l'illusion que le code en fait un.
3. **Un fixie n'a pas de frein : la seule facon de ralentir est de faire
   glisser le pneu arriere.** Le cout en vitesse est donc proportionnel a
   `slip`, pas au braquage. Un freinage qui ne passerait pas par la derive
   serait un velo a patins, pas un pignon fixe.
4. **Le decrochage est d'abord subi, pas demande.** Quand `braquage x vitesse`
   depasse `gripLimit`, l'arriere part tout seul : un virage trop sec derape
   sans que le joueur appuie sur quoi que ce soit. Le bouton sert a casser
   l'adherence volontairement dans les virages qui tiendraient, pas a deraper
   davantage : a braquage plein le decrochage subi sature deja a `maxSlip`.
5. **Tout est deterministe. Aucun `Math.random` dans une regle de jeu.** Memes
   entrees, meme resultat au bit pres. `tests/determinisme.mjs` le verifie, et
   c'est ce qui rend le restart instantane honnete : l'echec est toujours la
   faute du joueur. Un colis qu'autre chose que le joueur pourrait pousser
   detruirait le jeu.
6. **`city.js`, `bike.js`, `parcel.js`, `race.js` et `ghost.js` ne touchent ni
   au DOM ni au canvas.** C'est ce qui permet de tester les regles sans
   navigateur. Un `document` dans un de ces fichiers casse `tests/`.
7. **La collision se resout axe par axe.** Bloque sur un seul axe, on glisse le
   long du mur et on perd un peu de vitesse. Bloque sur les deux, on l'a pris de
   face et on pose le pied. Resoudre les deux axes ensemble collerait le velo
   aux murs et rendrait les lignes serrees impossibles.
8. **La carte est ecrite a la main, jamais generee.** Une ville procedurale ne
   s'apprend pas, et la connaitre est tout le sujet.
9. **La camera ne tourne jamais**, nord en haut. Suivre le cap serait plus
   immersif et rendrait la ville inapprenable.
   Elle se desserre en dessous de `VIEW_MIN` unites visibles sur le petit cote
   (un portrait de telephone ne montrerait qu'une dizaine de cases), elle a le
   droit de deborder de la ville de `EDGE_SLACK` d'ecran (sinon le coursier
   colle au bord au depart), et elle le remonte d'un cran sur petit ecran pour
   qu'il ne roule pas sous les pouces. Les trois sont dans `src/render.js`.
10. **Aucun chargement distant.** Pas de CDN, pas d'importmap, pas de police
   Google. `check.sh` echoue sinon.
11. **Aucun tiret cadratin** dans `index.html`, `style.css`, `src/`, `tests/`,
   `README.md`, `AGENTS.md`, `ROADMAP.md`. `check.sh` echoue sinon.
12. **`VERSION` se bumpe a chaque livraison**, et la ligne du tableau des
   versions du README se remplit.
13. **Pas de dependance npm, pas d'etape de build, pas de fichier binaire.**

## Ou depenser le budget graphique

`bakeCity()` dans `src/render.js` ne tourne qu'une fois : **tout ce qui y est
dessine coute zero par image**. Trottoirs, marquage, plaques d'egout, teintes de
quartier, ombres portees y sont deja. Mesure : 16,7 ms de frame mediane, p99 a
16,8, sur les deux gabarits, soit une fraction de pour cent du budget. Le jeu
n'a aucun probleme de performance ; tout gain visuel qui peut aller dans le bake
plutot que dans la boucle est gratuit.

Les traces de dérapage ont leur propre calque a l'echelle du monde, alimente une
fois par segment. Ne pas revenir a un chemin retrace a chaque image.

## Boucle de travail

```bash
./check.sh                  # 38 controles, ni reseau ni navigateur
python3 -m http.server 8012 # puis http://localhost:8012/?cb=<n>
```

Le `?cb=<n>` n'est pas decoratif : le serveur local n'envoie pas de
`Cache-Control`, Chrome sert alors l'ancien module ES et la modification semble
sans effet.

Pour piloter le jeu sans mains, la page expose `window.__alleycat` :

```js
__alleycat.show('race');          // ouvre la course
__alleycat.drive(2.0, 0, false);  // 2 s tout droit, rend { t, x, y, heading, speed }
__alleycat.drive(0.6, 1, true);   // 0,6 s a droite en skid
__alleycat.toss();                // lance le colis et le laisse se poser
__alleycat.state;                 // { screen, t, leg, done, bike, carrying, ... }
__alleycat.reset();
```

`drive` avance au pas fixe, donc un scenario rejoue donne exactement le meme
resultat. C'est la seule mesure fiable : `requestAnimationFrame` est ralenti des
que l'onglet passe en arriere plan.

## Regles de commit

- Une tache de `ROADMAP.md` par commit, message en francais, imperatif court.
- `./check.sh` vert avant chaque commit.
- Jamais de push direct sur `main` : pousser une branche, la preview sort sur
  `https://trstmnd.github.io/alleycat/preview/<branche>/`.

## Economie de tokens

Ce projet se developpe volontairement avec un petit modele.

- Ce fichier remplace l'exploration du depot. Ne relire un module entier que
  s'il est celui qu'on modifie.
- Cibler la lecture : `grep -n` sur un symbole plutot que `cat` sur un module.
- Une tache de la feuille de route a la fois, dans une session neuve.
- `./check.sh` en premier reflexe plutot que de faire relire le code au modele.
- Rien a coller dans le prompt : les invariants sont ici, pas dans la
  conversation.
