#!/usr/bin/env node
// Exports the audit's seed-film subset and a few seed people from src/background/seedData.ts
// into tests/fixtures/audit/seed-subset.json (provenance: "seed"). Run by hand when seeds change.
import { buildSync } from 'esbuild';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = mkdtempSync(join(tmpdir(), 'subsume-seed-'));
const outfile = join(tmp, 'seed.mjs');
buildSync({
  entryPoints: [join(ROOT, 'src/background/seedData.ts')],
  bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'error',
  alias: { '@': join(ROOT, 'src') },
});
const seed = await import(pathToFileURL(outfile).href);
const IDS = ['seed_nayakan','seed_pather_panchali','seed_manichitrathazhu','seed_meiyazhagan','seed_vikram','seed_96',
  'seed_parasite','seed_portrait_lady_fire','seed_everything_everywhere','seed_free_solo','seed_my_octopus_teacher',
  'seed_kireedam','seed_drishyam_ml','seed_charulata','seed_spadikam','seed_iruvar'];
const films = IDS.map((id) => seed.SEED_MEDIA.find((m) => m.id === id)).filter(Boolean);
if (films.length !== IDS.length) throw new Error('missing seed id');
const people = seed.SEED_PEOPLE.slice(0, 4);
writeFileSync(join(ROOT, 'tests/fixtures/audit/seed-subset.json'),
  JSON.stringify({ provenance: 'seed', source: 'src/background/seedData.ts', films, people }, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(films.length, 'films', people.length, 'people');
