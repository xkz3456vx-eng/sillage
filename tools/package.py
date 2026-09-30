"""Regénérer l'archive et le document de code intégral, sans dépendance externe."""
from pathlib import Path
import zipfile
import hashlib

root = Path(__file__).resolve().parent.parent
excluded = {'artifacts', '.git', 'node_modules', '.codex', '.agents', '__pycache__'}
generated = {'CODE_COMPLET.md', 'sillage-complet.zip', 'ARBORESCENCE.txt', 'MANIFEST.sha256'}
files = sorted(p for p in root.rglob('*') if p.is_file()
               and not any(part in excluded for part in p.relative_to(root).parts)
               and p.name not in generated)
names = [p.relative_to(root).as_posix() for p in files]
tree = 'Sillage/\n' + '\n'.join('  ' + name for name in names) + '\n'
(root / 'ARBORESCENCE.txt').write_text(tree, encoding='utf-8')

languages = {'.html': 'html', '.css': 'css', '.js': 'javascript', '.cjs': 'javascript',
             '.svg': 'svg', '.json': 'json', '.md': 'markdown', '.toml': 'toml',
             '.py': 'python', '.gpx': 'xml', '.xsd': 'xml'}
intro = '''# Sillage — livraison complète, fichier par fichier

Application HTML/CSS/JavaScript vanilla, sans build ni backend applicatif.
Leaflet, Leaflet.draw, Leaflet.Elevation et D3 sont livrés dans le dossier vendor.
BRouter exécute des profils BRF personnalisés, également fournis en entier.
Overpass fournit les services du corridor et Nominatim la recherche explicite.
IndexedDB conserve les projets et caches ; localStorage conserve les préférences.
Les SVG originaux sont livrés en variantes claire et sombre et dans un sprite.
Le README contient le démarrage, la configuration, les déploiements et limites.
Ce document contient chaque fichier texte intégral, sans omission de code.
Les fichiers générés CODE_COMPLET.md, MANIFEST.sha256 et l’archive ne s’incluent pas eux-mêmes.
Les captures de validation restent dans artifacts et ne sont pas requises au fonctionnement.

## Arborescence complète

```text
'''
parts = [intro, tree, '```\n']
for file, name in zip(files, names):
    content = file.read_text(encoding='utf-8-sig')
    # Five-backtick fences also contain README examples with triple fences.
    longest = max((len(run) for run in __import__('re').findall(r'`+', content)), default=0)
    fence = '`' * max(3, longest + 1)
    lang = languages.get(file.suffix, 'text')
    parts.append(f'\n## /{name}\n\n{fence}{lang}\n{content}')
    if not content.endswith('\n'):
        parts.append('\n')
    parts.append(f'{fence}\n')
(root / 'CODE_COMPLET.md').write_text(''.join(parts), encoding='utf-8')
hashes = '\n'.join(hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + name
                   for file, name in zip(files, names)) + '\n'
(root / 'MANIFEST.sha256').write_text(hashes, encoding='utf-8')
with zipfile.ZipFile(root / 'sillage-complet.zip', 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for file in files + [root/'ARBORESCENCE.txt', root/'MANIFEST.sha256', root/'CODE_COMPLET.md']:
        archive.write(file, file.relative_to(root).as_posix())
with zipfile.ZipFile(root / 'sillage-complet.zip') as archive:
    assert archive.testzip() is None
    assert 'index.html' in archive.namelist()
print(f'{len(files)} fichiers source ; {len(files)+3} entrées dans le ZIP vérifié.')
print(f'Archive : {(root / "sillage-complet.zip").stat().st_size:,} octets')
print(f'Code complet : {(root / "CODE_COMPLET.md").stat().st_size:,} octets')
