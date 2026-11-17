/**
 * Save-time record merge for books (workstream 2), run against REAL recorded Open Library responses
 * (tests/fixtures/audit/recorded/responses.json), not hand-written ones.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import recorded from './fixtures/audit/recorded/responses.json';
import type { MediaItem } from '@/shared/types';
import type { BookEdition } from '@/shared/catalogTypes';
import { OL_SEARCH_FIELDS, cleanDescription, searchOpenLibrary, clearOpenLibraryCache } from '@/background/openLibrary';
import { completeBookRecord } from '@/background/bookRecord';
import { chooseEdition } from '@/shared/bookEditions';
import { subjectsToGenres } from '@/shared/bookGenres';
import { catalogWorkToMediaItem } from '@/shared/compatibility';
import { getEditionsForWork } from '@/background/storage';

const REC = recorded as unknown as Record<string, { status: number; body: unknown }>;
const enc = encodeURIComponent;

function stubFetch(offline = false) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(url);
    const rec = offline ? undefined : REC[url];
    if (!rec) return new Response('offline', { status: 503 });
    return new Response(JSON.stringify(rec.body), { status: rec.status, headers: { 'content-type': 'application/json' } });
  }));
  return calls;
}

describe('fixtures match what the code requests', () => {
  it('recorded search URLs carry the same fields list the code sends', () => {
    const url = `https://openlibrary.org/search.json?q=${enc('the great gatsby')}&limit=8&fields=${OL_SEARCH_FIELDS}`;
    expect(REC[url]).toBeDefined();
    const doc = (REC[url].body as { docs: Array<Record<string, unknown>> }).docs[0];
    expect(doc.subject).toBeDefined();
    expect(doc.number_of_pages_median).toBeDefined();
  });
});

describe('cleanDescription', () => {
  it('strips HTML and markdown links from real Open Library text', () => {
    expect(cleanDescription('<b>THE GREAT GATSBY</b>, F. Scott<br>See [more](https://x.test/a)')).toBe('THE GREAT GATSBY, F. Scott\nSee more');
  });
});

describe('subjectsToGenres (bounded mapping)', () => {
  it('maps exact aliases, ignores everything else, caps at 3', () => {
    expect(subjectsToGenres(['Fiction', 'Rich people', 'Classics', 'Poetry', 'Drama'])).toEqual(['Fiction', 'Classics', 'Poetry']);
    expect(subjectsToGenres(['Married people, fiction', 'Revenge'])).toEqual([]);
    expect(subjectsToGenres(undefined)).toEqual([]);
  });
});

describe('chooseEdition', () => {
  const ed = (id: string, over: Partial<BookEdition>): BookEdition => ({ id, workId: 'w', title: 't', authors: [], providerIds: [], sourceProvenance: [], sourceConfidence: 'high', ...over });
  it('prefers the page edition, then ISBN, then most complete in language, then most complete', () => {
    const a = ed('a', { language: 'fre', pageCount: 100, coverUrl: 'c', description: 'd', isbn13: ['9780000000001'] });
    const b = ed('b', { language: 'eng', pageCount: 120 });
    const c = ed('c', { language: 'eng', pageCount: 130, coverUrl: 'c', isbn13: ['9780743273565'] });
    expect(chooseEdition([a, b, c], { preferredId: 'b' })?.edition.id).toBe('b');
    expect(chooseEdition([a, b, c], { isbn: '978-0-7432-7356-5' })?.edition.id).toBe('c');
    expect(chooseEdition([a, b, c], { language: 'eng' })?.edition.id).toBe('c');
    expect(chooseEdition([a, b], { language: 'ger' })?.edition.id).toBe('a');
    expect(chooseEdition([], {})).toBeNull();
  });
});

describe('completeBookRecord with real Open Library responses', () => {
  beforeEach(() => { clearOpenLibraryCache(); vi.unstubAllGlobals(); });

  it('fills description, pages, genres and records a source per field and the chosen edition', async () => {
    stubFetch();
    const hits = await searchOpenLibrary({ query: 'the great gatsby', limit: 8 });
    const media: MediaItem = catalogWorkToMediaItem(hits[0].work);
    expect(media.overview).toBeUndefined();
    const out = await completeBookRecord(media);
    expect(out.overview).toBeTruthy();
    expect(out.overview).not.toMatch(/<[a-z]/i);
    expect(out.pageCount).toBeGreaterThan(0);
    expect(out.genres.length).toBeGreaterThan(0);
    expect(out.fieldSources?.overview).toMatch(/^openlibrary:/);
    expect(out.fieldSources?.pageCount).toMatch(/^openlibrary:/);
    expect(out.fieldSources?.edition).toMatch(/OL\d+M/);
    expect(out.preferredEditionId).toMatch(/^openlibrary_edition_OL\d+M$/);
    expect((await getEditionsForWork(out.id)).length).toBeGreaterThan(0);
  });

  it('fills an unknown year from the search doc without using an edition publish year', async () => {
    stubFetch();
    const out = await completeBookRecord({
      id: 'openlibrary_work_OL468431W', canonicalTitle: 'The Great Gatsby', type: 'book', year: null,
      genres: [], ratings: [], providers: [], posterUrl: '', authors: ['F. Scott Fitzgerald'],
    });
    expect(out.year).toBe(1920); // what Open Library's own first_publish_year says
    expect(out.fieldSources?.year).toBe('openlibrary:search');
  });

  it('offline: returns the record unchanged apart from sources and never throws', async () => {
    stubFetch(true);
    const base: MediaItem = { id: 'openlibrary_work_OL468431W', canonicalTitle: 'The Great Gatsby', type: 'book', year: null, genres: [], ratings: [], providers: [], posterUrl: '' };
    const out = await completeBookRecord(base);
    expect(out.canonicalTitle).toBe('The Great Gatsby');
    expect(out.year).toBeNull();
    expect(out.overview).toBeUndefined();
  });

  it('does not touch films', async () => {
    const calls = stubFetch();
    const film: MediaItem = { id: 'seed_x', canonicalTitle: 'F', type: 'movie', year: 1999, genres: [], ratings: [], providers: [], posterUrl: '' };
    expect(await completeBookRecord(film)).toBe(film);
    expect(calls).toHaveLength(0);
  });
});
