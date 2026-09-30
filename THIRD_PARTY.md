# Composants redistribués

Les SVG de `assets/` sont originaux. Les bibliothèques ci-dessous sont des dépendances logicielles, livrées pour éviter un CDN à l’exécution. Aucun de leurs pictogrammes bitmap ou sprites propriétaires n’est utilisé : les repères et commandes de Sillage emploient ses SVG.

| Composant | Version / provenance | Licence incluse |
|---|---|---|
| Leaflet | 1.9.4, https://github.com/Leaflet/Leaflet | `vendor/LICENSE-leaflet.txt` (BSD-2-Clause) |
| Leaflet.draw | 1.0.4, https://github.com/Leaflet/Leaflet.draw | `vendor/LICENSE-leaflet-draw.txt` (MIT) |
| D3 | 4.13.0, https://github.com/d3/d3 | `vendor/LICENSE-d3.txt` (BSD-3-Clause) |
| Leaflet.Elevation | 0.0.4-d3v4, https://github.com/MrMufflon/Leaflet.Elevation | `vendor/LICENSE-leaflet-elevation.txt` (MIT) |
| Profils BRouter et dictionnaire | Instantané téléchargé le 29 septembre 2026, https://brouter.de/brouter/profiles2/ | `profiles/LICENSE-brouter.txt` (MIT), commentaires d’auteurs conservés dans les fichiers |

Les cinq bases sont trekking, gravel, mtb, hiking-beta et hiking-mountain. Les profils gravel créditent quaelnix ; les profils pédestres créditent poutnik et le projet BRouter. Les modifications exécutables Sillage sont délimitées par des commentaires et disponibles dans `js/profiles.js` ainsi que dans `profiles/sillage-*.brf`.

Les sources JavaScript embarquées de ces profils dans `js/profile-sources.js` proviennent des mêmes fichiers. Le plugin d’altimétrie est la version historique MIT de MrMufflon (avec D3 v4), pas le fork récent de Raruto distribué sous une autre licence.

Services de données, non redistribués : OpenStreetMap (ODbL), Overpass, Nominatim, BRouter ; fonds OpenTopoMap (attribution CC-BY-SA) et Esri World Imagery (attribution des fournisseurs). Consulter le README et les conditions propres aux fournisseurs avant un déploiement à grande audience.
