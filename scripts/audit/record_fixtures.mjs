#!/usr/bin/env node
/**
 * Records REAL keyless provider responses (Open Library, TVmaze) for the page audit.
 *
 * Run by hand, rarely:   node scripts/audit/record_fixtures.mjs
 * The audit itself (`npm run audit:pages`) never calls this and never touches the network;
 * it replays tests/fixtures/audit/recorded/responses.json.
 *
 * Every entry keeps the exact URL the extension code requests, the HTTP status and the body
 * as served (no trimming), plus recordedAt. Provenance for all of them is "recorded".
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'tests', 'fixtures', 'audit', 'recorded', 'responses.json');
const UA = 'subsume-audit-fixture-recorder (local dev; keyless public endpoints only)';

const enc = encodeURIComponent;
const OL = 'https://openlibrary.org';

// URLs must match exactly what src/background/openLibrary.ts and tvmaze.ts build.
const olSearch = (q) => `${OL}/search.json?q=${enc(q)}&limit=8`;
const olAuthors = (q) => `${OL}/search/authors.json?q=${enc(q)}`;

const BOOK_QUERIES = [
  'the great gatsby',
  'pride and prejudice',
  'cien años de soledad',
  'norwegian wood',
  'ponniyin selvan',
  'the god of small things',
  'godan premchand',
  'don quixote',
  'the odyssey homer',
  'intermezzo sally rooney',
  'kokila ramanlal desai',
  'midnight\'s children',
  'chemmeen',
  'zzqxv unmatched page candidate',
];
const ISBNS = ['9780743273565', '9780375704024', '9780141439518'];
const AUTHOR_QUERIES = ['kalki', 'arundhati roy'];
const TV_QUERIES = [
  'sacred games', 'dark', 'money heist', 'chernobyl', 'twin peaks', 'severance', 'panchayat', 'fleabag',
];

const urls = [];
for (const q of BOOK_QUERIES) urls.push(olSearch(q));
// The Search page asks for limit=20 when the Books filter is on; record that form too.
for (const q of BOOK_QUERIES) urls.push(`${OL}/search.json?q=${enc(q)}&limit=20`);
urls.push(`${OL}/search.json?q=${enc('zzqxv unmatched page candidate')}&limit=3`); // RESOLVE_PAGE_CANDIDATE title fallback uses limit=3
for (const q of AUTHOR_QUERIES) urls.push(olAuthors(q));
for (const i of ISBNS) urls.push(`${OL}/isbn/${i}.json`);
for (const q of TV_QUERIES) urls.push(`https://api.tvmaze.com/search/shows?q=${enc(q)}`);
urls.push('https://api.tvmaze.com/schedule?country=US&date=*'); // wildcard date; recorded below with a real date

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = {};

async function get(url, recordAs = url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = null; }
  out[recordAs] = { status: res.status, recordedAt: new Date().toISOString(), provenance: 'recorded', source: url, body };
  console.log(res.status, recordAs.slice(0, 110));
  await sleep(700);
  return body;
}

for (const url of urls) {
  if (url.includes('date=*')) {
    const d = new Date().toISOString().slice(0, 10);
    await get(`https://api.tvmaze.com/schedule?country=US&date=${d}`, url);
  } else {
    await get(url);
  }
}

// Follow-ups: work + editions + author works for the first hits, as the extension would request them.
const workKeys = new Set();
for (const q of BOOK_QUERIES) {
  const body = out[olSearch(q)]?.body;
  for (const doc of (body?.docs ?? []).slice(0, 3)) if (doc.key) workKeys.add(doc.key.replace('/works/', ''));
}
for (const i of ISBNS) {
  const w = out[`${OL}/isbn/${i}.json`]?.body?.works?.[0]?.key;
  if (w) workKeys.add(w.replace('/works/', ''));
}
// Only the first hit of each query is a "saved" book; limit follow-ups to keep the fixture small.
const savedWorks = new Set();
for (const q of BOOK_QUERIES) {
  const first = out[olSearch(q)]?.body?.docs?.[0]?.key;
  if (first) savedWorks.add(first.replace('/works/', ''));
}
for (const i of ISBNS) {
  const w = out[`${OL}/isbn/${i}.json`]?.body?.works?.[0]?.key;
  if (w) savedWorks.add(w.replace('/works/', ''));
}
for (const id of savedWorks) {
  await get(`${OL}/works/${id}.json`);
  await get(`${OL}/works/${id}/editions.json?limit=25`);
}
for (const q of AUTHOR_QUERIES) {
  const first = out[olAuthors(q)]?.body?.docs?.[0]?.key;
  if (!first) continue;
  const id = first.replace('/authors/', '');
  await get(`${OL}/authors/${id}.json`);
  await get(`${OL}/authors/${id}/works.json?limit=50`);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`wrote ${Object.keys(out).length} responses -> ${OUT}`);
