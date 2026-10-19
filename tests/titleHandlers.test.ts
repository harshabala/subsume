import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem } from '@/shared/types';
import { MessageType } from '@/shared/types';

vi.mock('@/background/tmdb', () => ({
  searchTitle: vi.fn(),
  searchTitles: vi.fn(),
  getLatestReleases: vi.fn(),
  enrichMediaWithOmdbRatings: vi.fn(async (m: MediaItem) => m),
  enrichMediaWithStreaming: vi.fn(async (m: MediaItem) => m),
  makeBearerHeaders: vi.fn((key: string) => ({ headers: { Authorization: `Bearer ${key}` } })),
  fetchWithRetry: vi.fn(),
  POSTER_BASE_URL: 'https://image.tmdb.org/t/p/w500',
}));
vi.mock('@/background/storage', () => ({
  findMediaByTitle: vi.fn(),
  putMediaItem: vi.fn(),
  getMediaItem: vi.fn(),
  getLibraryItem: vi.fn(),
  getAllMediaMap: vi.fn(),
  getPreferences: vi.fn(),
}));
vi.mock('@/background/tvmaze', () => ({ searchTvMaze: vi.fn() }));
vi.mock('@/background/trakt', () => ({ fetchTraktRating: vi.fn(async () => null) }));
vi.mock('@/background/wikidata', () => ({
  fetchWikipediaSummary: vi.fn(async () => null),
  fetchWikidataDirectorInfo: vi.fn(async () => null),
}));
vi.mock('@/background/discoverySearch', () => ({ discoverySearch: vi.fn(async () => []) }));
vi.mock('@/background/openCaptureTab', () => ({
  openCaptureCanvasTab: vi.fn(async () => ({ success: true })),
}));

import { titleHandlers } from '@/background/handlers/titles';
import * as tmdb from '@/background/tmdb';
import * as storage from '@/background/storage';
import * as tvmaze from '@/background/tvmaze';
import { discoverySearch } from '@/background/discoverySearch';
import { openCaptureCanvasTab } from '@/background/openCaptureTab';
import {
  resetOriginRateLimitsForTests,
  ORIGIN_RESOLVE_MAX_PER_WINDOW,
} from '@/background/originRateLimit';

const sender = (url = 'https://www.imdb.com/title/tt1375666/') =>
  ({ url, tab: { url } }) as unknown as chrome.runtime.MessageSender;

function media(overrides: Partial<MediaItem> = {}): MediaItem {
  return {
    id: 'tmdb_movie_27205',
    canonicalTitle: 'Inception',
    type: 'movie',
    year: 2010,
    genres: ['Science Fiction'],
    ratings: [{ provider: 'tmdb', score: 8.4, votes: 1000 }],
    providers: [{ provider: 'tmdb', externalId: '27205', url: 'https://www.themoviedb.org/movie/27205' }],
    posterUrl: 'https://image.tmdb.org/t/p/w500/inception.jpg',
    overview: 'A thief who steals corporate secrets through dream-sharing.',
    ...overrides,
  };
}

const call = (type: MessageType, payload: unknown, from = sender()) =>
  titleHandlers[type]!(payload, from);

beforeEach(() => {
  vi.clearAllMocks();
  resetOriginRateLimitsForTests();
  vi.mocked(storage.getPreferences).mockResolvedValue({ tmdbApiKey: '', omdbApiKey: '', region: 'US' } as never);
  vi.mocked(storage.getLibraryItem).mockResolvedValue(undefined);
  vi.mocked(storage.getMediaItem).mockResolvedValue(undefined);
  vi.mocked(storage.findMediaByTitle).mockResolvedValue(undefined as never);
  vi.mocked(tvmaze.searchTvMaze).mockResolvedValue(null);
});

describe('RESOLVE_POSTER (content-script reachable)', () => {
  it('rejects a non-numeric tmdbId without calling TMDb with the user key', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue({ tmdbApiKey: 'user-key', region: 'US' } as never);

    const res = await call(MessageType.RESOLVE_POSTER, {
      strategy: 'tmdb-cdn',
      tmdbId: '550/../../account',
      mediaType: 'movie',
    });

    expect(res).toEqual({ match: null });
    expect(tmdb.fetchWithRetry).not.toHaveBeenCalled();
    expect(storage.getMediaItem).not.toHaveBeenCalled();
  });

  it('rejects a mediaType other than movie or tv', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue({ tmdbApiKey: 'user-key', region: 'US' } as never);

    const res = await call(MessageType.RESOLVE_POSTER, {
      strategy: 'tmdb-cdn',
      tmdbId: '550',
      mediaType: 'person',
    });

    expect(res).toEqual({ match: null });
    expect(tmdb.fetchWithRetry).not.toHaveBeenCalled();
  });

  it('returns a cached tmdb-cdn match with the library status', async () => {
    vi.mocked(storage.getMediaItem).mockResolvedValue(media());
    vi.mocked(storage.getLibraryItem).mockResolvedValue({ mediaId: 'tmdb_movie_27205', status: 'watched', userRating: 9 } as never);

    const res = (await call(MessageType.RESOLVE_POSTER, {
      strategy: 'tmdb-cdn',
      tmdbId: '27205',
      mediaType: 'movie',
    })) as { match: Record<string, unknown> };

    expect(storage.getMediaItem).toHaveBeenCalledWith('tmdb_movie_27205');
    expect(res.match).toMatchObject({
      tmdbId: '27205',
      title: 'Inception',
      inLibrary: true,
      libraryStatus: 'watched',
      userRating: 9,
    });
  });

  it('resolves alt-text from the local catalogue with no TMDb key and caches the lookup', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media() as never);

    const first = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'Inception (2010)' })) as {
      match: { title: string } | null;
    };
    const second = (await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: 'inception (2010)' })) as {
      match: { title: string } | null;
    };

    expect(first.match?.title).toBe('Inception');
    expect(second.match?.title).toBe('Inception');
    expect(storage.findMediaByTitle).toHaveBeenCalledTimes(1);
    expect(storage.findMediaByTitle).toHaveBeenCalledWith('Inception', 2010);
    expect(tmdb.searchTitle).not.toHaveBeenCalled();
  });

  it('returns no match when nothing resolves', async () => {
    const res = await call(MessageType.RESOLVE_POSTER, { strategy: 'ancestor-text', query: 'Some Unknown Film' });
    expect(res).toEqual({ match: null });
  });

  it('rate-limits a single origin', async () => {
    let last: unknown;
    for (let i = 0; i <= ORIGIN_RESOLVE_MAX_PER_WINDOW; i++) {
      last = await call(MessageType.RESOLVE_POSTER, { strategy: 'alt-text', query: `Film number ${i}` });
    }
    expect(last).toEqual({ match: null, reason: 'rate_limited' });
  });
});

describe('GET_TITLE_DETAILS', () => {
  it('returns a local catalogue hit without network lookups', async () => {
    vi.mocked(storage.findMediaByTitle).mockResolvedValue(media({ streamingAvailability: [{ provider: 'Netflix' }] } as never) as never);

    const res = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Inception', yearGuess: 2010 })) as MediaItem;

    expect(res.canonicalTitle).toBe('Inception');
    expect(tmdb.searchTitle).not.toHaveBeenCalled();
    expect(tvmaze.searchTvMaze).not.toHaveBeenCalled();
  });

  it('falls back to TVmaze when TMDb has no key, and stores the result', async () => {
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('TMDB API key not configured. Please set it in Settings.'));
    const show = media({ id: 'tvmaze_tv_169', canonicalTitle: 'Breaking Bad', type: 'tv', year: 2008, providers: [] });
    vi.mocked(tvmaze.searchTvMaze).mockResolvedValue(show);

    const res = (await call(MessageType.GET_TITLE_DETAILS, { title: 'Breaking Bad', yearGuess: 2008 })) as MediaItem;

    expect(tvmaze.searchTvMaze).toHaveBeenCalledWith('Breaking Bad', 2008);
    expect(res.id).toBe('tvmaze_tv_169');
    expect(storage.putMediaItem).toHaveBeenCalledWith(expect.objectContaining({ id: 'tvmaze_tv_169' }));
  });

  it('throws a clear error when no source knows the title', async () => {
    vi.mocked(tmdb.searchTitle).mockRejectedValue(new Error('TMDB API key not configured. Please set it in Settings.'));

    await expect(call(MessageType.GET_TITLE_DETAILS, { title: 'Nope' })).rejects.toThrow(/not found/i);
  });
});

describe('SEARCH_TITLES', () => {
  it('uses the free discovery search when there is no TMDb key', async () => {
    await call(MessageType.SEARCH_TITLES, { query: 'Dune', type: 'movie' });
    expect(tmdb.searchTitles).not.toHaveBeenCalled();
    expect(discoverySearch).toHaveBeenCalledWith('Dune', 'movie');
  });

  it('falls back to free search when TMDb fails', async () => {
    vi.mocked(storage.getPreferences).mockResolvedValue({ tmdbApiKey: 'k' } as never);
    vi.mocked(tmdb.searchTitles).mockRejectedValue(new Error('500'));
    await call(MessageType.SEARCH_TITLES, { query: 'Dune' });
    expect(discoverySearch).toHaveBeenCalled();
  });
});

describe('navigation messages validate mediaId', () => {
  it('OPEN_CAPTURE_CANVAS rejects query-string injection', async () => {
    const res = await call(MessageType.OPEN_CAPTURE_CANVAS, { mediaId: 'x&page=settings' });
    expect(res).toMatchObject({ success: false });
    expect(openCaptureCanvasTab).not.toHaveBeenCalled();
  });

  it('OPEN_CAPTURE_CANVAS opens a valid id', async () => {
    await call(MessageType.OPEN_CAPTURE_CANVAS, { mediaId: 'tmdb_movie_27205' });
    expect(openCaptureCanvasTab).toHaveBeenCalledWith('tmdb_movie_27205');
  });

  it('OPEN_DETAIL rejects an invalid id and opens a valid one', async () => {
    vi.mocked(chrome.tabs.create).mockClear();
    expect(await call(MessageType.OPEN_DETAIL, { mediaId: '../../evil' })).toMatchObject({ success: false });
    expect(chrome.tabs.create).not.toHaveBeenCalled();

    await call(MessageType.OPEN_DETAIL, { mediaId: 'tmdb_movie_27205' });
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://test-extension-id/ui/index.html?mediaId=tmdb_movie_27205',
    });
  });
});
