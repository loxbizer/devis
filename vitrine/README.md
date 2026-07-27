# Vitrine — fond vidéo piloté au scroll (séquence d'images)

Fini le scrub de balise `<video>` (c'est ça qui saccadait et qui empêchait la
lecture automatique). Le nouveau système est celui des sites type Apple /
Musing : la vidéo est découpée en **images WebP haute qualité**, dessinées sur
un canvas. En descendant, le film avance ; en remontant, il **revient en
arrière** ; une inertie lisse le tout — zéro à-coup, et la qualité est
exactement celle des images extraites.

## Étape 1 — Découper la vidéo (sur ton Mac)

```bash
cd ~/Downloads
chmod +x extract-frames.sh
./extract-frames.sh journey.mp4
```

→ crée un dossier `frames/` (≈ 360 images max, ~25–40 Mo). Pour un rendu
Retina encore plus fin : `LARGEUR=2000 QUALITE=88 ./extract-frames.sh journey.mp4`.

## Étape 2 — Mettre les images en ligne

**Option A (recommandée) — ton projet Vercel existant :**

```bash
cp -R frames "$HOME/Downloads/genial-4.9/public/vitrine/frames"
cd "$HOME/Downloads/genial-4.9" && npx vercel@latest --prod --force
```

**Option B — ton stockage (type Supabase), comme tes envois précédents :**

```bash
U="https://TONPROJET.supabase.co/storage/v1/object/vitrine/frames" KEY="ta_cle" ./upload-frames.sh frames
```

## Étape 3 — La page

Dans `vitrine-labo.html`, bloc `CONFIG` en haut du `<script>` :

- `base` : URL du dossier des images
  (option A : `https://genial-indol.vercel.app/vitrine/frames` — déjà en place).
- `count` : laisse `0`, la page détecte le nombre d'images toute seule.
- `pxParImage` : monte-le pour un voyage plus lent au scroll.
- `inertie` : `0.10` par défaut ; baisse vers `0.07` pour un rendu plus
  flottant, monte vers `0.15` pour plus de réactivité.

Les textes se modifient directement dans le HTML (blocs `.chapitre`,
repérés par le commentaire « MODIFIE TES TEXTES ICI ») : `data-de` /
`data-a` fixent le moment d'apparition/disparition entre 0 et 1.

Ouvre ensuite simplement le fichier :

```bash
open ~/Downloads/vitrine-labo.html
```

Ça marche aussi en ouverture locale (pas de problème de CORS : les images
sont chargées comme des `<img>`, pas via `fetch`).
