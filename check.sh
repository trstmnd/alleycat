#!/usr/bin/env bash
# Controles deterministes d ALLEYCAT. Aucun reseau, aucun navigateur.
# Usage : ./check.sh
set -u
cd "$(dirname "$0")"
ok=0; ko=0
t() { if eval "$2" >/dev/null 2>&1; then echo "  OK   $1"; ok=$((ok+1)); else echo "  FAIL $1"; ko=$((ko+1)); fi; }
# Surtout pas de pipe ici : le code de sortie serait celui de sed, et un
# test rouge passerait pour vert.
tv() { if out=$(eval "$2" 2>&1); then echo "  OK   $1"; ok=$((ok+1)); else echo "  FAIL $1"; echo "$out" | sed 's/^/       /'; ko=$((ko+1)); fi; }

echo "ALLEYCAT - controles"

# 1. fichiers presents
for f in index.html style.css src/main.js src/city.js src/bike.js src/parcel.js \
         src/race.js src/ghost.js src/render.js src/audio.js src/input.js; do
  t "fichier $f" "[ -f '$f' ]"
done

# 2. syntaxe de chaque module (node lit le .mjs en module ES)
tmp=$(mktemp -d)
for f in src/*.js; do
  cp "$f" "$tmp/$(basename "$f" .js).mjs"
  t "syntaxe $f" "node --check '$tmp/$(basename "$f" .js).mjs'"
done

# 3. regles du jeu, testees sans navigateur
export SRC="$tmp"
for suite in city bike parcel race ghost determinisme; do
  tv "regles : $suite" "node tests/$suite.mjs"
done

# 4. le point d entree est bien cable
t "module main.js charge" "grep -q 'src/main.js' index.html"
t "un seul canvas" "[ \$(grep -c '<canvas' index.html) -eq 1 ]"
t "aucune balise script externe" "! grep -qE '<script[^>]+src=\"https?:' index.html"
t "aucune dependance npm" "[ ! -f package.json ]"
t "aucun import distant" "! grep -rqE \"from '(https?:|//)\" src/"

# 5. pas de fichier binaire
t "aucun fichier binaire" "[ -z \"\$(LC_ALL=C grep -rlP '\\x00' --exclude-dir=.git . )\" ]"

# 6. regles de style maison
t "aucun tiret cadratin" "! grep -rlP '\xe2\x80\x94' index.html style.css src/ tests/ README.md AGENTS.md ROADMAP.md"

# 7. cadrage pour les agents de code
t "AGENTS.md present" "[ -f AGENTS.md ]"
t "opencode.json valide" "node -e \"JSON.parse(require('fs').readFileSync('opencode.json','utf8'))\""

# 8. version et pas de simulation
t "version exposee" "grep -qE \"^export const VERSION = 'v[0-9]+\\.[0-9]+'\" src/main.js"
t "version injectee dans la page" "grep -q 'id=\"version\"' index.html"
t "pas de simulation fixe" "grep -qE '^export const SIM_STEP' src/main.js"

rm -rf "$tmp"
echo
echo "  $ok OK, $ko FAIL"
[ "$ko" -eq 0 ]
