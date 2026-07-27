#!/bin/bash
# Découpe une vidéo en images WebP pour la vitrine.
#
#   ./extract-frames.sh journey.mp4              → dossier frames/
#   ./extract-frames.sh journey.mp4 mondossier   → dossier mondossier/
#
# Réglages possibles (avant la commande) :
#   LARGEUR=2000 QUALITE=90 ./extract-frames.sh journey.mp4
#
# LARGEUR par défaut 1600 px : net en plein écran. Monte à 2000 pour
# un rendu Retina encore plus fin (fichiers ~1,5× plus lourds).
set -euo pipefail

VIDEO="${1:?Utilisation : ./extract-frames.sh video.mp4 [dossier_sortie]}"
SORTIE="${2:-frames}"
LARGEUR="${LARGEUR:-1600}"
QUALITE="${QUALITE:-82}"

command -v ffmpeg >/dev/null || { echo "ffmpeg est requis : brew install ffmpeg"; exit 1; }

DUREE=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")
# Viser 360 images maximum, sans dépasser 15 images/seconde :
# assez pour un mouvement parfaitement fluide, sans exploser le poids total.
FPS=$(awk -v d="$DUREE" 'BEGIN{f=360/d; if(f>15)f=15; printf "%.4f", f}')

mkdir -p "$SORTIE"
rm -f "$SORTIE"/f_*.webp

echo "Vidéo : $VIDEO (${DUREE%.*}s) → $FPS img/s, largeur ${LARGEUR}px, qualité $QUALITE"
ffmpeg -v error -stats -y -i "$VIDEO" \
  -vf "fps=$FPS,scale=$LARGEUR:-2:flags=lanczos" \
  -c:v libwebp -quality "$QUALITE" -compression_level 6 \
  "$SORTIE/f_%04d.webp"

NOMBRE=$(ls "$SORTIE"/f_*.webp | wc -l | tr -d ' ')
POIDS=$(du -sh "$SORTIE" | cut -f1)

echo
echo "=== Terminé : $NOMBRE images, $POIDS au total, dans $SORTIE/"
echo "La page détecte le nombre d'images toute seule ; si tu préfères le"
echo "fixer, mets  count: $NOMBRE  dans le CONFIG de vitrine-labo.html."
