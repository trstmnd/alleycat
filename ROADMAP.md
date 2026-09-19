# Feuille de route

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

## v0.2 : le jeu se laisse apprendre

- [ ] calibrer les medailles sur de vrais runs humains, pas sur le chemin theorique
- [ ] noms de rues lisibles sur la carte, pour pouvoir se reperer sans boussole
- [ ] option "sans boussole", et une medaille qui ne compte que dans ce mode
- [ ] ecran manifeste avant le depart : les trois adresses, trois secondes pour les lire
- [ ] plusieurs manifestes sur la meme ville, tires dans une liste ecrite a la main

## v0.3 : la matiere

- [ ] circulation : voitures qui tiennent leur file, portieres qui s'ouvrent
- [ ] la nuit, avec une portee de vue reduite
- [ ] fantome partageable par URL, sans serveur
- [ ] editeur de ville, la carte etant deja une simple chaine de caracteres

## Idees, pas encore des taches

- manifeste quotidien, le meme pour tout le monde, avec classement local
- mode "checkpoint libre" : trois depots, ordre au choix, la route optimale devient un probleme
- une deuxieme ville, plus dense, sans grille du tout
