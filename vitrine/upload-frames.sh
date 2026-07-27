#!/bin/bash
# Option B uniquement (stockage type Supabase). Si tu déploies via Vercel
# (option A du README), tu n'as pas besoin de ce script.
#
#   U="https://TONPROJET.supabase.co/storage/v1/object/vitrine/frames" \
#   KEY="ta_cle" \
#   ./upload-frames.sh frames
#
# Envoie les images en 8 connexions parallèles, avec réessais automatiques.
set -euo pipefail

DOSSIER="${1:-frames}"
: "${U:?Définis U (URL du dossier de stockage, sans / final)}"
: "${KEY:?Définis KEY (clé d'accès)}"

ls "$DOSSIER"/f_*.webp | xargs -P 8 -I{} sh -c '
  f="$1"; n=$(basename "$f")
  curl -s --retry 4 --retry-all-errors --max-time 90 -o /dev/null \
    -w "%{http_code} $n\n" \
    -X POST "'"$U"'/$n" \
    -H "Authorization: Bearer '"$KEY"'" \
    -H "Content-Type: image/webp" \
    -H "x-upsert: true" \
    --data-binary "@$f"
' _ {} | sort | uniq -c

echo "Tout doit afficher 200. Ensuite, mets l'URL publique du dossier dans CONFIG.base."
