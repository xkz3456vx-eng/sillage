# Vérification de la livraison

Vérifications effectuées le 29 septembre 2026.

## Tests exécutés

- 16 tests déterministes dans `tests/index.html` : distances/projections, segments disjoints, correspondance des surfaces BRouter, sept profils, exclusions PMR, contexte des variables BRF gravel, catégories et horaires POI, corridor Overpass, GPX mal formés/DTD/coordonnées invalides, aller-retour GPX avec échappement et altitudes manquantes, traitement d’une trace de 300 000 points, ancres de recalcul, validation d’URL, IndexedDB et cadence concurrente.
- 9 tests dans `tests/node.test.cjs` : aucun profil initial favorisé, validation JSON, impossibilité de rediriger les API depuis un fichier reçu, clés de prototype, identités des points, bornage des options, export avec symboles de services, annulation d’un résultat réseau tardif, réponse HTTP 429 conservant la trace antérieure.
- 152 contrôles statiques : syntaxe JavaScript, références HTML, éléments d’interface, sept BRF, licences et 62 fichiers SVG thématiques.
- `tests/export-validation.gpx` validé avec `lxml.etree.XMLSchema` contre le schéma GPX 1.1 officiel inclus dans `tests/gpx.xsd`.
- Sept profils personnalisés acceptés par le validateur public BRouter avec HTTP 200 et `profileid` sans champ `error`. Une incompatibilité initiale de portée des variables du profil gravel a été corrigée et les sept profils revalidés.

## Intégration navigateur et services réels

- Première ouverture : sept choix d’activité, aucun choix présélectionné.
- Recherches Nominatim explicites « Annecy » et « Sévrier » ; ajout des résultats comme départ et arrivée.
- Calcul BRouter réel du parcours gravel : environ 4,9 km, D+ 17 m / D− 10 m dans la méthode locale, altitudes 447–460 m, environ 97 % de surface revêtue et 3 % inconnue au moment du test.
- Requête Overpass réelle : eau potable, commerces, services vélo et hébergements obtenus et affichés.
- Graphique altimétrique visible ; correspondance de position carte/graphique constatée.
- Placement d’une fin d’étape sur la trace : journées d’environ 2,6 km et 2,3 km, dénivelés distincts.
- Rechargement du navigateur : trace, nom, profil, réglages et points restaurés depuis le brouillon.
- Enregistrement d’un parcours nommé, ouverture du menu d’export et création du lien base64 avec caractères français conservés.
- Boutons d’export GPX/JSON : génération de liens Blob `download` nommés ; aucune erreur JavaScript observée. L’outil de téléchargement du navigateur intégré n’a pas retourné de fichier lors du test automatisé. La validité du contenu est couverte indépendamment par les tests XML et XSD ; un lien explicite reste disponible si un navigateur intégré bloque le téléchargement automatique.
- Interface bureau contrôlée à 1440 × 900, thèmes clair et sombre ; carte, graphique et ouverture du carnet rétractable contrôlés à 390 × 844. Le CSS possède les seuils 1180 / 900 / 700 px ainsi que des adaptations de hauteur.

## Portée

Ces vérifications couvrent les scénarios ci-dessus. Elles ne constituent pas un test exhaustif de tous les navigateurs ni une garantie future des services publics. Les situations offline/CORS/timeouts possèdent des messages explicites ; les indisponibilités futures des fournisseurs restent externes à l’application.

Les limites opérationnelles, le choix d’une recherche Nominatim explicite, la portée indicative du D+/km, les incertitudes PMR et les limites de requêtes sur les voyages très longs sont détaillés dans le README.
