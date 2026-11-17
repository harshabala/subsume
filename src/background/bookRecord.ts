/**
 * One complete record per book, merged at save time (north-star workstream 2).
 *
 * Order of trust per field (first non-empty wins; the winner is recorded in MediaItem.fieldSources):
 *  - year:        work record (first_publish_date) > search doc (first_publish_year). Never an edition's publish year
 *                 (that is the edition's, not the book's); otherwise null = "Year unknown".
 *  - authors:     as saved (search/work) > work record > chosen edition.
 *  - description: work record > chosen edition > search first_sentence (a quotation; last resort).
 *  - pageCount:   chosen edition number_of_pages > search number_of_pages_median.
 *  - posterUrl:   as saved > chosen edition cover > work cover.
 *  - genres:      as saved > bounded subject mapping from work subjects > search subjects (see shared/bookGenres.ts).
 *  - edition:     the edition tied to the page / its ISBN > most complete in the reader's language > most complete.
 * Nothing is invented: a field no source has stays empty. Saving never fails or blocks on the network;
 * the fetch is capped, and a record saved offline is simply thinner.
 */
import type { MediaItem } from '@/shared/types';
import type { BookEdition } from '@/shared/catalogTypes';
import { chooseEdition } from '@/shared/bookEditions';
import { subjectsToGenres } from '@/shared/bookGenres';
import * as openLibrary from './openLibrary';
import { putEdition } from './storage';
import { logger } from '@/shared/logger';

export const ENRICH_TIMEOUT_MS = 8000;
const OL_WORK_ID = /^openlibrary_work_OL\d+W$/;

function readerLanguage(): string {
  try {
    const ui = (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) || 'en';
    const two = ui.toLowerCase().split('-')[0];
    const map: Record<string, string> = { en: 'eng', fr: 'fre', es: 'spa', de: 'ger', it: 'ita', pt: 'por', ru: 'rus', ja: 'jpn', zh: 'chi', ko: 'kor', ar: 'ara', hi: 'hin' };
    return map[two] ?? 'eng';
  } catch {
    return 'eng';
  }
}

/** Run a provider call; any throw, missing result or timeout becomes the fallback (saving never fails on enrichment). */
async function safe<T, F>(call: () => Promise<T> | T, fallback: F): Promise<T | F> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<F>((r) => { timer = setTimeout(() => r(fallback), ENRICH_TIMEOUT_MS); });
    const v = await Promise.race([Promise.resolve().then(call), timeout]);
    return v ?? fallback;
  } catch {
    return fallback;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function completeBookRecord(media: MediaItem): Promise<MediaItem> {
  if (media.type !== 'book' || !OL_WORK_ID.test(media.id)) return media;
  if (media.fieldSources?.edition) return media; // already completed on an earlier save
  const sources: Record<string, string> = { ...(media.fieldSources ?? {}) };
  const note = (field: string, src: string) => {
    if (!sources[field]) sources[field] = src;
  };
  // Fields already on the record came from the search hit (or ISBN resolve) that produced it.
  if (media.authors?.length) note('authors', 'openlibrary:search');
  if (media.year) note('year', 'openlibrary:search');
  if (media.posterUrl) note('posterUrl', 'openlibrary:search');
  if (media.pageCount) note('pageCount', 'openlibrary:search');

  const [workR, keyR, edsR] = await Promise.all([
    safe(() => openLibrary.getOpenLibraryWork(media.id), null),
    safe(() => openLibrary.getOpenLibraryWorkSearchDoc(media.id), null),
    safe(() => openLibrary.getOpenLibraryEditionsForWork(media.id), [] as BookEdition[]),
  ]);
  const work = workR;
  const keyDoc = keyR;
  const editions: BookEdition[] = edsR ?? [];

  const out: MediaItem = { ...media };
  const chosen = chooseEdition(editions, { preferredId: media.preferredEditionId, language: readerLanguage() });

  if (!out.year) {
    if (work?.firstReleaseYear) { out.year = work.firstReleaseYear; note('year', 'openlibrary:work'); }
    else if (keyDoc?.firstReleaseYear) { out.year = keyDoc.firstReleaseYear; note('year', 'openlibrary:search'); }
  }
  if (!out.authors?.length) {
    const a = work?.bookDetails?.authors?.length ? work.bookDetails.authors : chosen?.edition.authors;
    if (a?.length) { out.authors = a; note('authors', work?.bookDetails?.authors?.length ? 'openlibrary:work' : 'openlibrary:edition'); }
  }
  if (!out.overview) {
    if (work?.description) { out.overview = work.description; note('overview', 'openlibrary:work'); }
    else if (chosen?.edition.description) { out.overview = chosen.edition.description; note('overview', `openlibrary:edition ${chosen.edition.id}`); }
    else if (keyDoc?.bookDetails?.firstSentence) { out.overview = keyDoc.bookDetails.firstSentence; note('overview', 'openlibrary:search first_sentence (a quotation, last resort)'); }
  }
  if (chosen?.edition.pageCount) {
    out.pageCount = chosen.edition.pageCount;
    sources.pageCount = `openlibrary:edition ${chosen.edition.id}`;
  } else if (!out.pageCount && keyDoc?.bookDetails?.pageCountMedian) {
    out.pageCount = keyDoc.bookDetails.pageCountMedian;
    note('pageCount', 'openlibrary:search number_of_pages_median (median across editions)');
  }
  if (!out.posterUrl) {
    const c = chosen?.edition.coverUrl ?? work?.images.primary;
    if (c) { out.posterUrl = c; note('posterUrl', chosen?.edition.coverUrl ? `openlibrary:edition ${chosen.edition.id}` : 'openlibrary:work'); }
  }
  if (!out.genres?.length) {
    const subjects = work?.subjects?.length ? work.subjects : keyDoc?.subjects;
    const g = subjectsToGenres(subjects);
    if (g.length) { out.genres = g; note('genres', `mapped from openlibrary subjects (${work?.subjects?.length ? 'work' : 'search'})`); }
  }
  if (chosen) {
    out.preferredEditionId = chosen.edition.id;
    sources.edition = `${chosen.edition.id}: ${chosen.reason}`;
    try {
      for (const e of editions) await putEdition(e);
    } catch (err) {
      logger.warn('[Subsume] storing fetched editions failed:', err);
    }
  }
  out.fieldSources = sources;
  return out;
}
