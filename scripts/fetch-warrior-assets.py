"""Fetch the original CC0 armoured human, preserving its source information."""
import pathlib, urllib.request, re, json
root = pathlib.Path(__file__).resolve().parents[1]
folder = root / 'art-source' / 'warrior'
folder.mkdir(parents=True, exist_ok=True)
page = 'https://opengameart.org/content/knight-rigged-mid-poly'
html = urllib.request.urlopen(page).read().decode('utf-8')
links = re.findall(r'href="([^"]+)"', html)
print([link for link in links if '.blend' in link.lower()])
url = next(link for link in links if '.blend' in link.lower())
if url.startswith('/'): url = 'https://opengameart.org' + url
file = folder / 'Knight.blend'
if not file.exists(): urllib.request.urlretrieve(url, file)
(folder / 'SOURCE.json').write_text(json.dumps({'author': 'crownjoshua', 'title': 'Knight (Rigged - Mid Poly)', 'page': page, 'download': url, 'license': 'CC0 1.0', 'licenseUrl': 'https://creativecommons.org/publicdomain/zero/1.0/'}, indent=2), encoding='utf-8')
print(url, file.stat().st_size)
