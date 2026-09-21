# Feuille de route

## Reprise

**Dernier point : 21 septembre 2026, v0.4 en ligne.**

Quatre livraisons poussees sur `main`, 38 controles verts, arbre propre.

**Le site n'est pas en ligne, et ce n'est pas un bug du depot.** GitHub Pages
n'a jamais ete active sur `alleycat` : le workflow construit et pousse
`gh-pages` correctement a chaque commit, mais rien ne le sert. La preuve tient
en une comparaison : `dods-3000`, dont le site fonctionne, possede deux
workflows, le notre plus `pages-build-deployment` que **GitHub cree lui-meme**
quand Pages est regle sur une branche. `alleycat` n'a que le notre.

Le reglage est manuel et ne se fait pas par l'API : **Settings > Pages > Build
and deployment > Source = "Deploy from a branch", branche `gh-pages`, dossier
`/ (root)`**. Attention au piege : les depots recents arrivent avec la source
"GitHub Actions", qui ignore completement la branche `gh-pages`.

Pour verifier sans deviner, ouvrir `/version.txt` a la racine du site : il rend
le SHA du commit reellement servi.
Tout le contexte necessaire est dans ce depot : `AGENTS.md` pour les invariants,
`README.md` pour le fonctionnement, ce fichier pour la suite.

Une PR exterieure a cette session a epingle les deux actions du workflow au SHA
de leur commit plutot qu'au tag. **Ne pas revenir a `@v4`** : un tag se deplace,
un SHA non, et `peaceiris/actions-gh-pages` tourne avec `contents: write`.

Ce que je ferais en premier en reprenant, dans cet ordre :

1. **La secousse de camera sur les collisions.** `bike.hit` vaut deja 1 (on
   frotte) ou 2 (on l'a pris de face) et ne declenche **que du son** : taper un
   mur ne produit rien a l'ecran. C'est le retour manquant le plus criant, et la
   donnee est deja la. Une heure de travail pour le plus gros gain de sensation
   disponible.
2. **Le dezoom avec la vitesse.** Toute la machinerie de zoom est en place dans
   `src/render.js`, il n'y a qu'a la moduler. C'est le moyen le plus efficace de
   faire sentir la vitesse.
3. **Calibrer le bareme**, voir la question ouverte.

**La seule question ouverte : le bareme des medailles n'a jamais ete valide par
un humain.** Il est calcule sur le chemin optimal de la carte, et
`tools/autopilote.mjs` boucle en 41,7 s, soit argent. Si personne n'approche
l'or en jouant pour de vrai, c'est le bareme qu'il faut bouger, pas le joueur.
C'est la premiere tache du bloc v0.6.

Une tache par commit. Cocher en poussant. Les blocs sont ordonnes : le suivant
ne commence pas avant que le precedent soit vert.

## v0.1 : la boucle

- [x] ville fixe, ecrite a la main, connexite verifiee par `check.sh`
- [x] physique du velo : elan, braquage qui se ferme avec la vitesse, skid
- [x] collision qui glisse le long des murs et pose le pied de face
- [x] lancer du colis avec l'elan, reprise au sol si on rate
- [x] chrono, manifeste de trois depots, medailles calibrees
- [x] fantome du record personnel, restart instantane
- [x] simulation a pas fixe, determinisme teste
- [x] rendu canvas 2D, ville precalculee, camera nord en haut

## v0.2 : tient dans la main

- [x] zoom adaptatif : 16 cases de large en portrait au lieu de 10
- [x] camera qui deborde un peu de la ville, sinon le coursier colle au bas de
      la dalle des le depart
- [x] le coursier remonte au tiers superieur sur petit ecran, les pouces
      occupent le bas
- [x] HUD compact sous 520 px et sous 430 px de haut, le nom du depot ne passe
      plus a la ligne
- [x] bouton du son masque pendant la course : il tombait pile sous le pouce
      gauche, la ou on dirige

## v0.3 : le dérapage

- [x] dissocier le cap de la trajectoire, angle de derive borne
- [x] decrochage subi quand braquage x vitesse depasse l'adherence du pneu
- [x] roue arriere bloquee a la demande, le skid stop du fixie
- [x] la derive est le seul frein : le cout en vitesse la suit
- [x] velo dessine avec ses deux roues, roue avant en contre-braquage
- [x] traces depuis la roue arriere, intensite selon l'angle, calque dedie
- [x] independance au pas de temps verifiee par `check.sh`

## v0.4 : la ville a une matiere

- [x] etiquetage des paves en composantes connexes, teinte et hauteur par pave
- [x] quatre quartiers, un par quadrant, a saturation tres basse
- [x] variation de valeur par pave, deterministe
- [x] trottoirs et caniveaux le long de chaque pave
- [x] axe pointille dans les deux sens (les rues verticales n'en avaient aucun)
- [x] passages pietons aux vrais carrefours seulement, pas sur les esplanades
- [x] plaques d'egout semees de facon deterministe
- [x] ombres portees directionnelles, longueur selon la hauteur du pave

## v0.5 : le retour au joueur

Tout est par image, mais la mesure dit qu'il reste 16 ms de budget par image sur
les deux gabarits. Aucun de ces points n'a de cout reel.

- [ ] secousse de camera sur `bike.hit` : 1 frotte, 2 de face. Rien a l'ecran
      aujourd'hui, seulement un son
- [ ] dezoom avec la vitesse (1 vers 0,92), la machinerie de zoom existe deja
- [ ] poussiere a la roue arriere pendant un dérapage, l'angle est expose
- [ ] ombre du colis qui se detache en vol, gerbe a l'atterrissage : ca vend le
      geste signature du jeu
- [ ] vignette qui se resserre avec la vitesse

## v0.6 : le jeu se laisse apprendre

- [ ] calibrer les medailles sur de vrais runs humains, pas sur le chemin theorique
- [ ] noms de rues lisibles sur la carte, pour pouvoir se reperer sans boussole
- [ ] option "sans boussole", et une medaille qui ne compte que dans ce mode
- [ ] ecran manifeste avant le depart : les trois adresses, trois secondes pour les lire
- [ ] plusieurs manifestes sur la meme ville, tires dans une liste ecrite a la main

## v0.7 : la matiere

- [ ] circulation : voitures qui tiennent leur file, portieres qui s'ouvrent
- [ ] la nuit, avec une portee de vue reduite
- [ ] fantome partageable par URL, sans serveur
- [ ] editeur de ville, la carte etant deja une simple chaine de caracteres

## Idees, pas encore des taches

- manifeste quotidien, le meme pour tout le monde, avec classement local
- mode "checkpoint libre" : trois depots, ordre au choix, la route optimale devient un probleme
- une deuxieme ville, plus dense, sans grille du tout
- remplacer l'ecran d'arrivee par une **spoke card** : le format carre qui se
  glisse dans les rayons, avec le nom de la course, la date, le temps et la
  medaille. C'est l'objet que les coursiers gardent des mois, donc c'est aussi
  exactement l'ecran qu'on partage
