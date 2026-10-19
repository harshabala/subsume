import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/shared/types';
import type { PersonItem } from '@/shared/types';
import type { CatalogWork, Creator } from '@/shared/catalogTypes';

vi.mock('@/background/tmdb', () => ({
  searchPerson: vi.fn(),
  fetchPersonDetails: vi.fn(),
  fetchPersonFilmography: vi.fn(),
}));
vi.mock('@/background/storage', () => ({
  getPreferences: vi.fn(),
  getPersonById: vi.fn(),
  savePerson: vi.fn(),
  deletePerson: vi.fn(),
  updatePersonSync: vi.fn(),
  getMediaItem: vi.fn(),
  getAllPeople: vi.fn(),
  putCreator: vi.fn(),
  putMediaItem: vi.fn(),
}));
vi.mock('@/background/openLibrary', () => ({
  searchOpenLibraryAuthors: vi.fn(),
  getOpenLibraryAuthorWorks: vi.fn(),
}));
vi.mock('@/background/handlers/utils', () => ({ broadcastMessage: vi.fn() }));

import { peopleHandlers } from '@/background/handlers/people';
import * as tmdb from '@/background/tmdb';
import * as storage from '@/background/storage';
import * as openLibrary from '@/background/openLibrary';
import { broadcastMessage } from '@/background/handlers/utils';

const call = (type: MessageType, payload: unknown) =>
  peopleHandlers[type]!(payload, {} as chrome.runtime.MessageSender);

const prefs = (over: Record<string, unknown> = {}) =>
  vi.mocked(storage.getPreferences).mockResolvedValue({ tmdbApiKey: '', openLibraryEnabled: true, ...over } as never);

const author: Creator = {
  id: 'openlibrary_author_OL23919A',
  name: 'J.K. Rowling',
  roles: ['author'],
  biography: "Known for Harry Potter and the Philosopher's Stone",
  knownForWorkIds: [],
  followedAt: 0,
  lastSyncedAt: 0,
  externalIds: [],
};

function work(id: string, title: string): CatalogWork {
  return {
    id,
    medium: 'book',
    canonicalTitle: title,
    firstReleaseYear: 1997,
    genres: [],
    images: {},
    externalIds: [],
    creatorCredits: [],
    bookDetails: { authors: ['J.K. Rowling'] },
    sourceProvenance: [],
    sourceConfidence: 'high',
    createdAt: 0,
    updatedAt: 0,
  } as unknown as CatalogWork;
}

beforeEach(() => {
  vi.clearAllMocks();
  prefs();
  vi.mocked(storage.getPersonById).mockResolvedValue(undefined as never);
  vi.mocked(openLibrary.searchOpenLibraryAuthors).mockResolvedValue([]);
  vi.mocked(openLibrary.getOpenLibraryAuthorWorks).mockResolvedValue([]);
});

describe('SEARCH_PERSON', () => {
  it('returns no results for a blank query without any lookup', async () => {
    expect(await call(MessageType.SEARCH_PERSON, { query: '   ' })).toEqual({ results: [] });
    expect(storage.getPreferences).not.toHaveBeenCalled();
  });

  it('searches Open Library authors with no TMDb key', async () => {
    vi.mocked(openLibrary.searchOpenLibraryAuthors).mockResolvedValue([author]);

    const res = (await call(MessageType.SEARCH_PERSON, { query: 'Rowling' })) as { results: Array<Record<string, unknown>> };

    expect(tmdb.searchPerson).not.toHaveBeenCalled();
    expect(res.results).toEqual([
      expect.objectContaining({
        id: 'openlibrary_author_OL23919A',
        knownForDepartment: 'Author',
        knownFor: [{ title: "Harry Potter and the Philosopher's Stone", mediaType: 'book' }],
      }),
    ]);
  });

  it('merges TMDb people and authors, dropping duplicate ids', async () => {
    prefs({ tmdbApiKey: 'k' });
    vi.mocked(tmdb.searchPerson).mockResolvedValue([
      { id: '525', name: 'Christopher Nolan', knownForDepartment: 'Directing', profilePath: null, knownFor: [] },
      { id: '525', name: 'Christopher Nolan', knownForDepartment: 'Directing', profilePath: null, knownFor: [] },
    ] as never);
    vi.mocked(openLibrary.searchOpenLibraryAuthors).mockResolvedValue([author]);

    const res = (await call(MessageType.SEARCH_PERSON, { query: 'Nolan' })) as { results: Array<{ id: string }> };

    expect(res.results.map((r) => r.id)).toEqual(['525', 'openlibrary_author_OL23919A']);
  });

  it('still returns authors when TMDb search fails', async () => {
    prefs({ tmdbApiKey: 'k' });
    vi.mocked(tmdb.searchPerson).mockRejectedValue(new Error('500'));
    vi.mocked(openLibrary.searchOpenLibraryAuthors).mockResolvedValue([author]);

    const res = (await call(MessageType.SEARCH_PERSON, { query: 'Rowling' })) as { results: unknown[] };
    expect(res.results).toHaveLength(1);
  });

  it('reports the missing key when no source is enabled', async () => {
    prefs({ openLibraryEnabled: false });
    expect(await call(MessageType.SEARCH_PERSON, { query: 'Nolan' })).toEqual({ error: 'TMDb API key not set' });
  });
});

describe('FOLLOW_PERSON — Open Library author', () => {
  const req = {
    personId: 'openlibrary_author_OL23919A',
    name: 'J.K. Rowling',
    knownForDepartment: 'Author',
    profilePath: 'javascript:alert(1)',
    knownFor: [{ title: 'Harry Potter', mediaType: 'book' as const }],
    role: 'writer' as const,
  };

  it('stores the author, their works and a follow broadcast without a TMDb key', async () => {
    vi.mocked(openLibrary.getOpenLibraryAuthorWorks).mockResolvedValue([
      work('openlibrary_work_OL82563W', "Harry Potter and the Philosopher's Stone"),
    ]);

    expect(await call(MessageType.FOLLOW_PERSON, req)).toEqual({ success: true });

    expect(storage.putMediaItem).toHaveBeenCalledWith(expect.objectContaining({ type: 'book' }));
    const creator = vi.mocked(storage.putCreator).mock.calls[0][0];
    expect(creator.knownForWorkIds).toEqual(['openlibrary_work_OL82563W']);
    expect(creator.profileImageUrl).toBeUndefined(); // non-http profile path dropped
    expect(creator.externalIds[0].url).toBe('https://openlibrary.org/authors/OL23919A');
    const saved = vi.mocked(storage.savePerson).mock.calls[0][0] as PersonItem;
    expect(saved).toMatchObject({ role: 'writer', knownFor: ['Harry Potter'] });
    expect(broadcastMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'follow' }));
  });

  it('still follows when the works fetch fails', async () => {
    vi.mocked(openLibrary.getOpenLibraryAuthorWorks).mockRejectedValue(new Error('offline'));
    expect(await call(MessageType.FOLLOW_PERSON, req)).toEqual({ success: true });
    expect(vi.mocked(storage.putCreator).mock.calls[0][0].knownForWorkIds).toEqual([]);
  });

  it('is idempotent for an already-followed author', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue({ id: req.personId } as never);
    expect(await call(MessageType.FOLLOW_PERSON, req)).toEqual({ alreadyFollowing: true });
    expect(storage.savePerson).not.toHaveBeenCalled();
  });
});

describe('FOLLOW_PERSON — TMDb person', () => {
  const req = {
    personId: '525',
    name: 'Christopher Nolan',
    knownForDepartment: 'Directing',
    profilePath: '/nolan.jpg',
    knownFor: [{ title: 'Inception' }, { title: 'Memento' }, { title: 'Dunkirk' }, { title: 'Tenet' }],
    role: 'director' as const,
  };

  it('requires a TMDb key', async () => {
    await expect(call(MessageType.FOLLOW_PERSON, req)).rejects.toThrow('TMDb API key not set');
  });

  it('saves the person and syncs the filmography in the background', async () => {
    prefs({ tmdbApiKey: 'k' });
    vi.mocked(tmdb.fetchPersonDetails).mockResolvedValue({ biography: 'British-American filmmaker.' } as never);
    vi.mocked(tmdb.fetchPersonFilmography).mockResolvedValue([{ tmdbId: '27205', mediaType: 'movie' }] as never);

    expect(await call(MessageType.FOLLOW_PERSON, req)).toEqual({ success: true });

    expect(storage.savePerson).toHaveBeenCalledWith(
      expect.objectContaining({ id: '525', biography: 'British-American filmmaker.', knownFor: ['Inception', 'Memento', 'Dunkirk'] }),
    );
    await vi.waitFor(() => expect(storage.updatePersonSync).toHaveBeenCalledWith('525', ['tmdb_movie_27205']));
  });

  it('does not crash when knownFor is missing', async () => {
    prefs({ tmdbApiKey: 'k' });
    vi.mocked(tmdb.fetchPersonDetails).mockResolvedValue({ biography: '' } as never);
    vi.mocked(tmdb.fetchPersonFilmography).mockResolvedValue([]);

    expect(await call(MessageType.FOLLOW_PERSON, { ...req, knownFor: undefined })).toEqual({ success: true });
    expect(vi.mocked(storage.savePerson).mock.calls[0][0].knownFor).toEqual([]);
  });
});

describe('UNFOLLOW_PERSON / GET_FILMOGRAPHY / SYNC_FILMOGRAPHY', () => {
  it('unfollow of an unknown id does not delete or broadcast', async () => {
    expect(await call(MessageType.UNFOLLOW_PERSON, { personId: 'nobody' })).toEqual({ success: true });
    expect(storage.deletePerson).not.toHaveBeenCalled();
    expect(broadcastMessage).not.toHaveBeenCalled();
  });

  it('unfollow deletes and broadcasts for a followed person', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue({ id: '525' } as never);
    await call(MessageType.UNFOLLOW_PERSON, { personId: '525' });
    expect(storage.deletePerson).toHaveBeenCalledWith('525');
    expect(broadcastMessage).toHaveBeenCalledWith(expect.objectContaining({ action: 'unfollow' }));
  });

  it('filmography for an unknown person is empty', async () => {
    expect(await call(MessageType.GET_FILMOGRAPHY, { personId: '1' })).toEqual({ items: [], person: null });
  });

  it('filmography drops ids with no stored media', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue({ id: '525', filmographyIds: ['tmdb_movie_1', 'tmdb_movie_2'] } as never);
    vi.mocked(storage.getMediaItem).mockImplementation(async (id: string) =>
      (id === 'tmdb_movie_1' ? { id, canonicalTitle: 'Following' } : undefined) as never,
    );

    const res = (await call(MessageType.GET_FILMOGRAPHY, { personId: '525' })) as { items: Array<{ id: string }> };
    expect(res.items.map((i) => i.id)).toEqual(['tmdb_movie_1']);
  });

  it('author bibliography is fetched on first view and stored', async () => {
    vi.mocked(storage.getPersonById).mockResolvedValue({ id: 'openlibrary_author_OL1A', filmographyIds: [] } as never);
    vi.mocked(openLibrary.getOpenLibraryAuthorWorks).mockResolvedValue([work('openlibrary_work_OL1W', 'Book')]);
    vi.mocked(storage.getMediaItem).mockImplementation(async (id: string) => ({ id }) as never);

    const res = (await call(MessageType.GET_FILMOGRAPHY, { personId: 'openlibrary_author_OL1A' })) as { items: Array<{ id: string }> };

    expect(storage.updatePersonSync).toHaveBeenCalledWith('openlibrary_author_OL1A', ['openlibrary_work_OL1W']);
    expect(res.items.map((i) => i.id)).toEqual(['openlibrary_work_OL1W']);
  });

  it('TMDb sync without a key returns an error instead of throwing', async () => {
    expect(await call(MessageType.SYNC_FILMOGRAPHY, { personId: '525' })).toEqual({ error: 'TMDb API key not set' });
  });

  it('TMDb sync stores the filmography ids', async () => {
    prefs({ tmdbApiKey: 'k' });
    vi.mocked(storage.getPersonById).mockResolvedValue({ id: '525', role: 'director' } as never);
    vi.mocked(tmdb.fetchPersonFilmography).mockResolvedValue([
      { tmdbId: '1', mediaType: 'movie' },
      { tmdbId: '2', mediaType: 'tv' },
    ] as never);

    expect(await call(MessageType.SYNC_FILMOGRAPHY, { personId: '525' })).toEqual({ synced: 2 });
    expect(storage.updatePersonSync).toHaveBeenCalledWith('525', ['tmdb_movie_1', 'tmdb_tv_2']);
  });

  it('GET_ALL_PEOPLE wraps the stored list', async () => {
    vi.mocked(storage.getAllPeople).mockResolvedValue([{ id: '525' }] as never);
    expect(await call(MessageType.GET_ALL_PEOPLE, {})).toEqual({ people: [{ id: '525' }] });
  });
});
