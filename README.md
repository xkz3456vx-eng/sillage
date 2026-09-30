# Sillage — l’atelier des itinéraires

Application statique de création d’itinéraires vélo et randonnée, en français. Pas de compte, de clé API payante, de backend applicatif ni d’étape de build. Les bibliothèques nécessaires sont incluses dans `vendor/` ; aucun CDN JavaScript n’est utilisé à l’exécution.

## Démarrer

1. Décompressez `sillage-complet.zip`, ou utilisez ce dossier tel quel.
2. Servez **la racine du dossier**, sans compilation :

   ```sh
   python -m http.server 8787
   ```

3. Ouvrez `http://localhost:8787` et choisissez une activité parmi les sept proposées.

Si Node est installé, le serveur fourni suffit aussi :

```sh
node tools/server.cjs
```

Il affiche son adresse locale (port 8080 par défaut). Si Windows réserve ce port :

```powershell
$env:PORT = '8787'
node tools/server.cjs
```

L’ouverture directe de `index.html` fonctionne pour l’interface, les fichiers locaux, les traces, les statistiques et les exports. **Utilisez HTTP(S) pour les services cartographiques publics** : `file://` ne fournit pas de Referer web valide et certains navigateurs restreignent le stockage et les requêtes depuis un fichier. Le navigateur affiche une explication. Un simple serveur statique suffit, sans backend.

## Architecture

Les scripts ES6+ classiques, chargés avec `defer`, publient leurs modules dans l’espace de noms `Sillage`. Cette approche fonctionne aussi en `file://`, contrairement aux imports ES modules selon les navigateurs. `app.js` porte l’état du projet ; `ui.js` traduit les interactions en opérations métier. `map.js` encapsule Leaflet, `routing.js` BRouter, `poi.js` Overpass et `geocoding.js` Nominatim. `elevation.js` calcule les statistiques et adapte le plugin Leaflet.Elevation livré. `gpx.js` valide et sérialise les fichiers sans dépendance XML externe. `storage.js` utilise IndexedDB, avec préférences dans localStorage et repli localStorage si IndexedDB échoue. Les SVG sont originaux ; les fonds cartographiques et données sont crédités à leurs fournisseurs.

## Utilisation

- **Créer** : choisissez une activité, recherchez explicitement une adresse, puis ajoutez le départ et d’autres points. Un clic gauche sur la carte ajoute un point.
- **Affiner** : déplacez un repère, supprimez-le par clic droit ou bouton, modifiez son nom, réordonnez les lignes par glisser-déposer ou boutons ↑/↓ accessibles au clavier. Inversez ou fermez la boucle.
- **Réglages** : la tolérance au non-revêtu, l’évitement du trafic, l’objectif de D+/km et l’exclusion des péages changent le profil BRouter réellement exécuté. Le recalcul commence après 500 ms d’inactivité. Vitesse et distance journalière ont un effet local. Changer d’activité au-delà de 200 km demande confirmation.
- **Zones à éviter** : dans « Étapes & zones à éviter », dessinez un cercle ; Échap annule le dessin. Ces zones utilisent le paramètre BRouter `nogos` (rayon en mètres).
- **Étapes** : proposez des fins de journée selon la distance souhaitée, ou placez-les sur la trace. Les repères J1, J2… sont déplaçables ; la liste donne distance et dénivelé de chaque journée.
- **Haltes** : « À proximité » recherche les catégories choisies dans un corridor de 200 m à 3 km. Les fiches montrent horaires, distance à la trace et lien OSM. « Ajouter au parcours » insère un point de routage ; « Inclure dans le GPX » sélectionne un waypoint de service sans changer la trace.
- **Relief** : survolez le graphique ou la trace pour synchroniser leur curseur. Les flèches gauche/droite parcourent le graphique au clavier. Le bouton Altimétrie replie le panneau.
- **Sauvegarder** : le brouillon est enregistré automatiquement ; Enregistrer crée/met à jour le projet nommé dans « Mes sorties ». Ouvrir un autre projet ou importer sauvegarde une copie de récupération du précédent. Renommez, dupliquez ou supprimez vos projets dans la liste.
- **Exporter** : GPX 1.1, projet JSON complet, profil `.brf` exact ou lien sans backend. Un JSON exporté n’inclut pas les URLs d’API de l’expéditeur. Le GPX conserve tous les points de trace, les points nommés importés, les fins d’étape et les services sélectionnés.
- **Importer** : GPX 1.0/1.1 avec trace ou route, ou JSON Sillage v1. Les segments disjoints restent distincts. Le recalcul GPX est explicite et utilise au maximum 120 ancres espacées le long de la trace ; il peut modifier le parcours et relier des segments disjoints.
- **Partager** : le fragment du lien contient nom, points de routage, profil, options, étapes et zones à éviter ; le destinataire recalcule la trace. Toute personne ayant le lien peut lire ces informations. Pour préserver exactement la géométrie et les services sélectionnés, utilisez GPX/JSON. Les liens dépassant 16 000 caractères sont refusés au profit du JSON, sans tronquer les données.

## Profils et paramètres exacts

La table réglable se trouve dans `js/profiles.js`. Sources BRouter figées : `profiles/*.brf`, embarquées à l’identique dans `js/profile-sources.js`. Les **sept fichiers `profiles/sillage-*.brf`** sont les profils personnalisés complets avec leurs valeurs initiales. Les modifications des curseurs génèrent le même type de fichier ; Exporter → Profil BRouter permet de récupérer la version exacte.

| Activité | Base BRouter | Non-revêtu | Trafic | D+ m/km | km/j | km/h | POI initiaux |
|---|---|---:|---|---:|---:|---:|---|
| Route | `trekking` personnalisé | 5 % | Fort | 12 | 90 | 23 | Eau, courses, vélo, transports |
| Gravel | `gravel` personnalisé | 65 % | Fort | 20 | 75 | 17 | Eau, courses, vélo, hébergements |
| VTT | `mtb` personnalisé | 95 % | Fort | 35 | 45 | 12 | Eau, courses, vélo |
| Trekking / voyage | `trekking` personnalisé | 40 % | Fort | 18 | 70 | 16 | Eau, courses, hébergements, toilettes, vélo |
| Randonnée | `hiking-beta`, ou `hiking-mountain` si objectif >40 m/km | 90 % | Fort | 40 | 22 | 4,5 | Eau, hébergements, courses, transports |
| Poussette / PMR | `hiking-beta` + exclusions conservatrices | 0 % | Fort | 5 | 12 | 3 | Eau, toilettes, transports, pharmacies |
| Bikepacking | `gravel`, ou `trekking` sous 50 % | 65 % | Fort | 25 | 65 | 15 | Eau, courses, hébergements, toilettes, vélo |

Le serveur public propose `hiking-beta` et **pas** un profil nommé simplement `hiking` au moment de la livraison. `trekking` est choisi pour la route, conformément à l’alternative trekking/fastbike demandée.

Les paramètres ne sont pas des chaînes fictives `avoid-unpaved` ou `avoid-toll` : ils sont des expressions `.brf` exécutées par BRouter :

- `sil_terrain = 12 × (1 - tolérance/100)²` sur les surfaces explicitement non revêtues ; coût ajouté au profil de base. 100 % retire cette pénalité additionnelle, sans supprimer les contraintes du profil.
- `sil_traffic` ajoute `4 × niveau` sur trunk/primary et `1,5 × niveau` sur secondary, où niveau vaut 0, 1 ou 2. Pas de trafic temps réel.
- `toll=yes` reçoit `costfactor=10000` si l’exclusion des péages est active.
- Les escaliers sont exclus sauf pour la randonnée et le VTT, dont les bases gèrent leurs propres conditions.
- `uphillcost = arrondi(20 + 180 × (1 - objectif/100))`, `uphillcutoff=1.5`. Descente : coût 35 et seuil 1.5. En PMR : coût descente 180, seuils montée/descente 1.
- **PMR** : exclusions `highway=steps`, `wheelchair=no`, surfaces autres que asphalt/paved/concrete/paving_stones ; path/footway sans `wheelchair=yes|designated` exclus. Le dictionnaire public BRouter ne contient pas la largeur des chemins : aucune fausse garantie de largeur n’est affichée. Une voie étroite mal renseignée peut subsister. Ces filtres ne certifient ni l’accessibilité ni une pente maximale réelle.
- Une zone à éviter produit `nogos=longitude,latitude,rayon|…`. 12 cercles maximum, 20 km de rayon maximum par cercle.
- Les altitudes, surfaces et statistiques sont celles réellement présentes ; aucune altitude de remplacement n’est inventée.

Le plafond de D+/km est **un objectif**, pas une contrainte dure mathématiquement garantie par BRouter. L’application modifie les coûts de montée et avertit si la moyenne obtenue dépasse l’objectif. Le découpage journalier est fondé sur la distance ; les hébergements sont recherchés autour des arrivées, pas imposés au moteur comme destinations automatiques.

### Protocole BRouter

1. `POST https://brouter.de/brouter/profile` avec le `.brf` en `text/plain;charset=UTF-8`.
2. Lecture de `profileid` et rejet explicite de toute réponse contenant `error`, même avec HTTP 200.
3. `GET https://brouter.de/brouter?lonlats=lon,lat|…&profile=custom_…&format=geojson&alternativeidx=0&nogos=…`.

Les uploads sont mis en cache 6 heures ; les calculs 7 jours, par URL exacte. Le calcul est découpé par groupes de 16 points, avec un point commun ; requêtes séquentielles espacées d’au moins 1,1 s. Une modification annule les requêtes précédentes et invalide leurs résultats tardifs. En cas d’échec, la dernière trace reste visible, avec un indicateur « à recalculer » et avertissement avant export.

Pour modifier les sources officielles, éditez les fichiers `.brf`, puis exécutez `node tools/build-assets.cjs`. Régénérez les sept profils par `node tools/validate-profiles.cjs`. **Cette maintenance est facultative ; les fichiers livrés sont déjà générés.**

## Configurer les instances

Pour votre propre navigateur : Paramètres → Instances de services. Pour toutes les nouvelles installations : `js/config.js`.

```js
brouter: 'https://brouter.de/brouter',
profileUpload: 'https://brouter.de/brouter/profile',
overpass: [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
],
nominatim: 'https://nominatim.openstreetmap.org/search'
```

Une instance BRouter personnelle doit fournir le calcul ET accepter l’envoi des profils, disposer des données régionales nécessaires et autoriser CORS. L’URL de publication est configurée séparément, car les reverse proxies ne suivent pas tous le même schéma. Ne changez pas uniquement l’URL du calcul en oubliant celle des profils.

Les fonds de carte sont configurables dans `config.tiles`. Pas de clé incluse ; pour un fournisseur nécessitant une clé, ajoutez-la dans votre configuration publique selon ses règles et limitez-la par origine. N’y placez jamais un secret serveur.

## Conditions des services publics

**Nominatim public interdit l’autocomplétion réseau.** La saisie propose donc uniquement les résultats déjà présents dans votre historique local ; Entrée/Rechercher envoie une requête explicite. Délai local minimal 1,2 s, cache 30 jours. La case d’autocomplétion réseau est ignorée pour `nominatim.openstreetmap.org` ; activez-la seulement avec une instance dont les conditions l’autorisent.

La politique publique limite l’ensemble d’une application à 1 requête/s, et pas seulement chaque onglet. Un site à forte audience doit utiliser une instance propre ou un proxy avec limitation globale. Une application statique ne peut garantir une limite distribuée entre plusieurs appareils. Le développeur qui déploie est responsable de ce choix et de son exploitation. Politique : <https://operations.osmfoundation.org/policies/nominatim/>.

**User-Agent :** un navigateur maîtrise son en-tête User-Agent. Le code ne tente pas de le falsifier. L’identification web utilise le Referer HTTP(S), conservé avec `strict-origin-when-cross-origin`, ainsi que le contact Nominatim facultatif. Un proxy auto-hébergé peut envoyer `User-Agent: Sillage/1.0 (+URL-de-votre-site; contact=...)`. Hébergez une page/contact public pour votre installation.

**Tuiles OSM :** seulement les tuiles affichées, cache HTTP du navigateur, aucune prélecture massive ni téléchargement hors ligne. Attribution visible. Politique : <https://operations.osmfoundation.org/policies/tiles/>. Les fonds OpenTopoMap et Esri ont leurs propres conditions ; leurs attributions restent affichées.

**Overpass :** POST sérialisés, au moins 2,2 secondes entre départs, cache IndexedDB de 24 heures avec clé serveurs + bbox arrondie vers l’extérieur + catégories. Trois tentatives maximum, attente progressive/Retry-After et bascule de miroir. Le corridor est découpé en zones d’environ 8 km de progression ; les POI sont filtrés par distance géométrique à la trace, pas seulement par appartenance à une bbox. Pas de nouvelle requête lorsqu’on déplace simplement la carte. Les résultats avec `remark` d’erreur sont rejetés plutôt que présentés comme complets.

Les lieux recherchés et coordonnées de routage sont envoyés aux fournisseurs sélectionnés. Les sauvegardes locales et noms de projet ne sont pas téléversés vers un compte. Les données OpenStreetMap relèvent de l’ODbL ; respectez les obligations de cette licence lors de réutilisations plus importantes : <https://www.openstreetmap.org/copyright>.

## Déploiement

### Netlify

Glissez le dossier contenant `index.html` et tous ses sous-dossiers dans Netlify Drop, ou reliez un dépôt. Aucun build command ; publish directory `.`. HTTPS est fourni. N’envoyez pas seulement `index.html`.

### Vercel

Importez un dépôt, choisissez le préréglage « Other », pas de commande de build, répertoire de sortie `.`. Ou utilisez `vercel` depuis le dossier si la CLI est déjà installée. Le fichier `vercel.json` fournit les en-têtes de base. Pas de fonctions serveur.

### GitHub Pages

Commitez les sources, puis Settings → Pages → Deploy from a branch, dossier `/ (root)` de la branche choisie. `.nojekyll` désactive le traitement Jekyll. Tous les liens internes sont relatifs, donc compatibles avec un sous-chemin `/nom-du-depot/`. Le partage conserve ce sous-chemin.

Pas de réécriture SPA nécessaire : l’application a une seule page et le partage utilise le fragment `#sillage=`. Les services externes doivent accepter votre origine ; une erreur CORS est affichée et ne se répare pas en masquant le message dans l’interface.

## Vérification

- Ouvrez `/tests/index.html` via le serveur statique : tests de distances, surfaces BRouter, profils, GPX invalides et aller-retour XML, segments disjoints, altitudes absentes, 300 000 points, cache IndexedDB et cadence des requêtes. Aucun appel aux API publiques dans ces tests.
- `node tools/check.cjs` vérifie la syntaxe des scripts, les références locales et les livrables.
- `node tools/validate-profiles.cjs --live` envoie les sept profils complets au validateur BRouter public, séquentiellement et à faible cadence. Ne l’utilisez pas dans une boucle de CI publique.
- Le compte rendu de livraison est dans `VALIDATION.md`.

Scénario manuel : choisir gravel → chercher Annecy → définir le départ → chercher Sévrier → ajouter une étape → vérifier la trace et le graphique → déplacer un point → inverser → essayer boucle → inclure un point d’eau → exporter GPX → réimporter → enregistrer et recharger → vérifier la restauration → passer en thème sombre → tester un écran mobile → couper Internet et vérifier les messages explicites.

## Limites connues

- Services gratuits sans garantie de disponibilité ; pas de routage ni de nouvelles tuiles hors connexion. Les bibliothèques et projets restent locaux ; un cache navigateur vidé ou un mode privé peut supprimer les sauvegardes. L’export JSON est la sauvegarde portable.
- Les quotas sont limités dans chaque onglet. Une exploitation partagée importante nécessite une infrastructure adaptée aux politiques des fournisseurs.
- Les surfaces ne sont connues que si BRouter/OSM les fournit. Les messages sont associés à leurs coordonnées de fin de segment ; un segment non associé reste gris. Les pourcentages peuvent différer de 100 % après arrondis. Un GPX classique ne contient généralement aucune surface.
- La difficulté est un indicateur heuristique (part de sentiers et D+/km), pas une cotation sportive officielle. Les horaires OSM sont traduits sommairement ; l’état ouvert/fermé en temps réel, les exceptions calendaires et les fuseaux horaires ne sont pas déduits.
- D+/D− utilisent une hystérésis de 3 m ; ils peuvent différer du GPS ou de BRouter. Altitudes absentes : aucune interpolation inventée, métriques signalées comme partielles. Durée = distance/vitesse + correction de montée (600 m/h à pied ou 1 100 m/h à vélo), hors pauses, météo et portage.
- Alerte eau : absence de point **OSM connu** dans le corridor sur un intervalle d’au moins 35 km ; aucune garantie de potabilité actuelle ou d’exhaustivité. Alerte hébergement : requête supplémentaire dans un rayon géométrique de 5 km autour de chaque arrivée, jusqu’à 20 jours. Ce rayon n’est pas une distance routable.
- Limites explicites : fichier 25 Mo, trace 300 000 points, 160 points de routage, 100 fins d’étape, 12 exclusions, 5 000 POI conservés, 600 marqueurs POI visibles simultanément dans la fenêtre, liste paginée. Les traces complètes sont préservées pour l’export ; seuls les affichages et recherches utilisent une simplification.
- Recherche POI limitée à 80 zones (environ 640 km selon géométrie). Les résultats incomplets sont annoncés et les alertes d’absence ne sont pas affirmées pour une couverture incomplète. Pour de très longs voyages, créez des projets par région. Les corridors traversant le méridien 180° doivent être scindés.
- Des points trop éloignés dans une même requête peuvent dépasser les ressources du serveur public ; une erreur invite à rapprocher/ajouter des points ou diviser le projet. Les batchs limitent le nombre de points par appel, pas la distance maximale calculable par un serveur.
- PMR : le réseau de routage ne renseigne pas toutes les largeurs, obstacles ni pentes. Le profil est conservateur mais ne peut certifier un itinéraire accessible.
- La capture raster de la carte, optionnelle dans le cahier des charges, n’est pas intégrée : les restrictions CORS et les conditions des fonds diffèrent. Les exports opérationnels sont GPX, JSON et BRF.

## Évolutions possibles

Proxy facultatif de mutualisation des quotas et en-tête User-Agent serveur ; fonds vectoriels avec droits hors ligne ; moteur de recherche autorisant les suggestions réseau ; worker de calcul géométrique pour des traces dépassant les limites actuelles ; données locales d’accessibilité, horaires OSM complets et estimation de temps plus spécialisée.

## Licence et provenance

Code de l’application et SVG originaux : MIT, voir `LICENSE`. Les bibliothèques et profils conservent leurs auteurs et licences, voir `THIRD_PARTY.md` et les fichiers de licence voisins. Les fonds de carte ne sont pas des illustrations propriétaires intégrées au projet : ils sont servis à la demande avec leurs attributions. Aucun logo ni pictogramme de marque tiers n’est employé dans l’interface.
