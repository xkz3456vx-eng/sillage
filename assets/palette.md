# Palette Sillage

Les pictogrammes SVG, le logo et le favicon sont originaux et dessinés dans ce projet. Formes : tracé arrondi de 1,7 unité sur une grille 24 × 24. Chaque pictogramme existe en fichier `-light.svg` et `-dark.svg`, plus un sprite `currentColor` pour l’interface. `js/icons.js` embarque le sprite pour l’ouverture directe depuis un fichier local.

| Rôle | Clair | Sombre |
|---|---|---|
| Texte principal | `#203638` | `#e1eceb` |
| Texte secondaire | `#697c80` | `#9eb0b2` |
| Panneaux | `#ffffff` | `#1c2e31` |
| Fond d’interface | `#f4f6f8` | `#142326` |
| Action / marque | `#17645a` | `#79c7aa` |
| Pictogrammes autonomes | `#17645a` | `#9cddbf` |
| Accent logo / focus | `#eeb555` | `#eeb555` |
| Asphalte / surface revêtue | `#2676db` bleu | même valeur |
| Gravier / chemin | `#e49732` orange | même valeur |
| Sentier / terre | `#99613e` brun | même valeur |
| Surface inconnue | `#8995a5` gris | même valeur |

Les couleurs de surface restent identiques entre thèmes pour ne pas changer la lecture du tracé. La légende contient également des noms et des pourcentages. Les fonds cartographiques restent ceux des fournisseurs ; le thème sombre réduit leur luminosité (sauf satellite). Les panneaux, popups, boutons et graphiques possèdent leur propre thème sombre.

Génération reproductible : `node tools/build-assets.cjs`. Il s’agit d’une commande de maintenance ; aucun build n’est requis pour lancer l’application livrée.
