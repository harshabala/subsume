/**
 * Bounded mapping from Open Library subject strings to a small genre vocabulary.
 *
 * Rules (documented so nothing is invented):
 *  - A subject maps only when its normalised text (lowercase, trimmed, punctuation stripped) EXACTLY
 *    equals an alias below. No fuzzy or substring guessing.
 *  - Subjects that match nothing are ignored. If nothing matches, genres stay empty.
 *  - At most MAX_BOOK_GENRES genres, in order of first appearance in the subject list.
 */
export const MAX_BOOK_GENRES = 3;

const ALIASES: Record<string, string[]> = {
  Fiction: ['fiction', 'novel', 'novels', 'literary fiction', 'general fiction', 'english fiction', 'american fiction'],
  Classics: ['classics', 'classic literature', 'classic fiction', 'literature classics'],
  'Historical fiction': ['historical fiction', 'historical novels'],
  'Science fiction': ['science fiction', 'sci-fi', 'scifi'],
  Fantasy: ['fantasy', 'fantasy fiction', 'epic fantasy'],
  Mystery: ['mystery', 'mystery fiction', 'detective and mystery stories', 'detective fiction'],
  Thriller: ['thriller', 'thrillers', 'suspense', 'suspense fiction'],
  Romance: ['romance', 'love stories', 'romance fiction'],
  Horror: ['horror', 'horror fiction', 'horror tales'],
  Poetry: ['poetry', 'poems', 'verse'],
  Drama: ['drama', 'plays'],
  'Short stories': ['short stories', 'short story'],
  Biography: ['biography', 'biographies', 'biography autobiography'],
  Memoir: ['memoir', 'memoirs', 'autobiography'],
  History: ['history'],
  Philosophy: ['philosophy'],
  "Children's": ["children's fiction", "children's stories", "juvenile fiction", "children's literature"],
};

const LOOKUP = new Map<string, string>();
for (const [genre, aliases] of Object.entries(ALIASES)) {
  for (const a of aliases) LOOKUP.set(a, genre);
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[.,;:()]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function subjectsToGenres(subjects: readonly string[] | undefined | null): string[] {
  const out: string[] = [];
  for (const raw of subjects ?? []) {
    if (typeof raw !== 'string') continue;
    const n = normalise(raw);
    const hit = LOOKUP.get(n);
    if (hit && !out.includes(hit)) out.push(hit);
    if (out.length >= MAX_BOOK_GENRES) break;
  }
  return out;
}
