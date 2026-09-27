import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('docs/references', { recursive: true });
const sources = [];
for (const id of ['412020', '1888930']) {
  const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${id}&l=english&cc=us`);
  const json = await response.json();
  const payload = typeof json === 'string' ? JSON.parse(json) : json;
  const data = payload[id]?.data ?? Object.values(payload)[0]?.data;
  if (!data?.screenshots) throw new Error(`Missing official screenshots: ${id}`);
  for (const index of [0, 2]) {
    const url = data.screenshots[index].path_full;
    const file = `reference-${id}-${index}.jpg`;
    const image = await fetch(url);
    if (!image.ok) throw new Error(`Download failed: ${url}`);
    await writeFile(`docs/references/${file}`, new Uint8Array(await image.arrayBuffer()));
    sources.push({ file, game: data.name, source: url, page: `https://store.steampowered.com/app/${id}/`, use: 'Visual reference only. Copyright belongs to the game publisher. Not distributed as a runtime asset.' });
    console.log(file, data.name);
  }
}
await writeFile('docs/references/sources.json', JSON.stringify(sources, null, 2));
