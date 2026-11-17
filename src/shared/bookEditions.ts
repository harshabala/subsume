import type { BookEdition } from './catalogTypes';

/** Common ISO 639-2/3 → short display labels for edition lists. */
const LANGUAGE_LABELS: Record<string, string> = {
  eng: 'English',
  en: 'English',
  fre: 'French',
  fra: 'French',
  fr: 'French',
  spa: 'Spanish',
  es: 'Spanish',
  ger: 'German',
  deu: 'German',
  de: 'German',
  ita: 'Italian',
  it: 'Italian',
  por: 'Portuguese',
  pt: 'Portuguese',
  rus: 'Russian',
  ru: 'Russian',
  jpn: 'Japanese',
  ja: 'Japanese',
  chi: 'Chinese',
  zho: 'Chinese',
  zh: 'Chinese',
  kor: 'Korean',
  ko: 'Korean',
  ara: 'Arabic',
  ar: 'Arabic',
  hin: 'Hindi',
  hi: 'Hindi',
  und: 'Unknown',
};

/**
 * Human-readable language for an edition (OL keys are usually 3-letter codes).
 */
export function formatEditionLanguage(language?: string | null): string | undefined {
  if (!language?.trim()) return undefined;
  const raw = language.trim();
  const key = raw.toLowerCase().replace(/^\/languages\//, '');
  return LANGUAGE_LABELS[key] ?? raw.toUpperCase();
}

/**
 * Prefer ISBN-13, then ISBN-10.
 */
export function formatEditionIsbn(edition: Pick<BookEdition, 'isbn13' | 'isbn10'>): string | undefined {
  const isbn13 = edition.isbn13?.find((v) => typeof v === 'string' && v.trim());
  if (isbn13) return isbn13.trim();
  const isbn10 = edition.isbn10?.find((v) => typeof v === 'string' && v.trim());
  if (isbn10) return isbn10.trim();
  return undefined;
}

/**
 * Compact meta parts for list rows: language · ISBN · publisher · format · date.
 */
export function editionMetaParts(
  edition: Pick<
    BookEdition,
    'language' | 'isbn13' | 'isbn10' | 'publisher' | 'format' | 'publishedDate' | 'pageCount'
  >,
): string[] {
  const parts: string[] = [];
  const lang = formatEditionLanguage(edition.language);
  if (lang) parts.push(lang);
  const isbn = formatEditionIsbn(edition);
  if (isbn) parts.push(`ISBN ${isbn}`);
  if (edition.publisher?.trim()) parts.push(edition.publisher.trim());
  if (edition.format) parts.push(edition.format);
  if (edition.publishedDate?.trim()) parts.push(edition.publishedDate.trim());
  if (typeof edition.pageCount === 'number' && edition.pageCount > 0) {
    parts.push(`${edition.pageCount} pp`);
  }
  return parts;
}

/**
 * Single-line label for selects / accessibility: title · meta…
 */
export function formatEditionListLabel(
  edition: Pick<
    BookEdition,
    | 'title'
    | 'subtitle'
    | 'language'
    | 'isbn13'
    | 'isbn10'
    | 'publisher'
    | 'format'
    | 'publishedDate'
    | 'pageCount'
  >,
): string {
  const title = edition.subtitle?.trim()
    ? `${edition.title.trim()} — ${edition.subtitle.trim()}`
    : edition.title.trim();
  const meta = editionMetaParts(edition);
  if (meta.length === 0) return title || 'Edition';
  return [title || 'Edition', ...meta].join(' · ');
}

/**
 * Preferred edition first; stable relative order among the rest.
 */
export function sortEditionsPreferredFirst<T extends { id: string }>(
  editions: T[],
  preferredEditionId?: string | null,
): T[] {
  if (!preferredEditionId || editions.length < 2) return editions.slice();
  const preferred = editions.filter((e) => e.id === preferredEditionId);
  if (preferred.length === 0) return editions.slice();
  const rest = editions.filter((e) => e.id !== preferredEditionId);
  return [...preferred, ...rest];
}

export interface ChooseEditionOptions {
  /** Edition already tied to the page the user saved from (e.g. resolved from the page's ISBN). */
  preferredId?: string;
  /** ISBN seen on the page; an edition carrying it wins. */
  isbn?: string;
  /** 3-letter language code of the reader's UI language (e.g. "eng"). */
  language?: string;
}

export interface ChosenEdition {
  edition: BookEdition;
  /** Human-readable reason, stored as fieldSources.edition. */
  reason: string;
}

function completeness(e: BookEdition): number {
  let n = 0;
  if (typeof e.pageCount === 'number' && e.pageCount > 0) n++;
  if (e.coverUrl) n++;
  if (e.description) n++;
  if (e.isbn13?.length || e.isbn10?.length) n++;
  if (e.publisher) n++;
  if (e.publishedDate) n++;
  if (e.authors?.length) n++;
  return n;
}

/**
 * Choose one edition deliberately:
 *  1. the edition already tied to the page (preferredId) or carrying the page's ISBN;
 *  2. otherwise the most complete edition in the reader's language;
 *  3. otherwise the most complete edition overall.
 * Ties keep the first (Open Library order). Returns null when there are no editions.
 */
export function chooseEdition(
  editions: readonly BookEdition[],
  opts: ChooseEditionOptions = {},
): ChosenEdition | null {
  if (editions.length === 0) return null;
  if (opts.preferredId) {
    const e = editions.find((x) => x.id === opts.preferredId);
    if (e) return { edition: e, reason: 'matches the edition tied to the saved page' };
  }
  if (opts.isbn) {
    const want = opts.isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
    const e = editions.find((x) => [...(x.isbn13 ?? []), ...(x.isbn10 ?? [])].some((i) => i.toUpperCase() === want));
    if (e) return { edition: e, reason: 'matches the ISBN on the saved page' };
  }
  const lang = opts.language?.toLowerCase();
  const inLang = lang ? editions.filter((e) => e.language?.toLowerCase() === lang) : [];
  const pool = inLang.length > 0 ? inLang : [...editions];
  let best = pool[0];
  for (const e of pool) if (completeness(e) > completeness(best)) best = e;
  return {
    edition: best,
    reason: inLang.length > 0 ? `most complete edition in ${lang}` : 'most complete edition (no edition in the reader language)',
  };
}
