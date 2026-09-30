/* Configuration publique : aucune clé ni secret. Modifier avant déploiement.
 * Le navigateur impose son User-Agent ; l'identification web se fait par Referer.
 * Un proxy personnel doit envoyer User-Agent: Sillage/1.0 (+URL de votre site).
 * Nominatim public : recherches explicites uniquement, <= 1/s par application.
 * À grande audience, utiliser des instances personnelles (limites partagées).
 */
window.Sillage = {};
Sillage.config = {
  version: 1, name: 'Sillage',
  brouter: 'https://brouter.de/brouter',
  profileUpload: 'https://brouter.de/brouter/profile',
  overpass: ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'],
  nominatim: 'https://nominatim.openstreetmap.org/search',
  autocomplete: false, // true seulement pour une instance autorisant explicitement cet usage.
  contact: '', // Adresse de contact de l'exploitant, facultative dans Nominatim &email=.
  tiles: {
    osm: {name: 'Standard', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'},
    topo: {name: 'Topographique', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', maxZoom: 17, attribution: '© OpenStreetMap · SRTM · <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)'},
    satellite: {name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', maxZoom: 19, attribution: 'Tiles © Esri · Sources: Esri, Maxar, Earthstar Geographics, GIS community'}
  },
  center: [46.6, 2.5], zoom: 6,
  debounce: 500, routeInterval: 1100, overpassInterval: 2200, geocodeInterval: 1200,
  timeout: 90000, poiRadius: 700, poiTTL: 86400000, routeTTL: 604800000,
  maxWaypoints: 160, routeBatch: 16, maxPoints: 300000, maxFileBytes: 25000000,
  maxPOIs: 5000, maxCorridorChunks: 80,
  surface: {road: '#2676db', gravel: '#e49732', trail: '#99613e', unknown: '#8995a5'},
  /* Exact BRouter protocol (not invented avoid-* flags):
   * profile=<id>, lonlats=lon,lat|..., nogos=lon,lat,radius|...,
   * format=geojson, alternativeidx=0. Custom profiles are POSTed as text/plain
   * to profileUpload; returned profileid is used in subsequent route queries.
   * See profiles.js for real BRF expressions for unpaved, traffic, toll & PMR.
   * Climbing m/km is a soft cost plus a post-routing warning, not a hard limit.
   */
};
