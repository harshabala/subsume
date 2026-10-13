import os

genres_code = """import { BASE_URL, getTmdbApiKey, fetchWithRetry, makeBearerHeaders } from './client';

let GENRE_MAP: Record<number, string> = {};
let GENRE_MAP_LOADED = false;
let genreMapPromise: Promise<void> | null = null;

export async function loadGenreMap(): Promise<Record<number, string>> {
  if (GENRE_MAP_LOADED) return GENRE_MAP;
  if (!genreMapPromise) {
    genreMapPromise = (async () => {
      try {
        const key = getTmdbApiKey();
        const [movieRes, tvRes] = await Promise.all([
          fetchWithRetry(`${BASE_URL}/genre/movie/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
          fetchWithRetry(`${BASE_URL}/genre/tv/list?language=en-US`, 3, 500, makeBearerHeaders(key)),
        ]);
        const movieData = await movieRes.json();
        const tvData = await tvRes.json();
        const map: Record<number, string> = {};
        for (const g of movieData.genres || []) {
          map[g.id] = g.name;
        }
        for (const g of tvData.genres || []) {
          map[g.id] = g.name;
        }
        GENRE_MAP = map;
        GENRE_MAP_LOADED = true;
      } catch (err) {
        console.error('[Subsume] Failed to load genre map:', err);
        genreMapPromise = null;
        throw err;
      }
    })();
  }
  await genreMapPromise;
  return GENRE_MAP;
}
"""

enrichment_code = """import { MediaItem } from '@/shared/types';
import { getPreferences } from '../storage';
import { fetchOmdbRatings } from '../omdb';
import { fetchWatchProviders } from './streaming';

/**
 * Attaches streamingAvailability to a MediaItem using the user's region.
 */
export async function enrichMediaWithStreaming(
  item: MediaItem,
  region?: string,
  releaseDate?: string
): Promise<MediaItem> {
  const tmdbProvider = item.providers.find((p) => p.provider === 'tmdb');
  if (!tmdbProvider?.externalId) return item;

  let effectiveRegion = region;
  if (!effectiveRegion) {
    try {
      const prefs = await getPreferences();
      effectiveRegion = prefs.region || 'US';
    } catch {
      effectiveRegion = 'US';
    }
  }

  const availability = await fetchWatchProviders(
    tmdbProvider.externalId,
    item.type,
    effectiveRegion,
    { releaseDate }
  );

  return {
    ...item,
    streamingAvailability: availability,
  };
}

/**
 * Merges OMDb IMDb/RT ratings into a MediaItem without duplicating providers.
 */
export async function enrichMediaWithOmdbRatings(item: MediaItem): Promise<MediaItem> {
  const omdbRatings = await fetchOmdbRatings(item.canonicalTitle, item.year, item.type);
  if (omdbRatings.length === 0) {
    return item;
  }

  const existingProviders = new Set(item.ratings.map((rating) => rating.provider));
  const newRatings = omdbRatings.filter((rating) => !existingProviders.has(rating.provider));
  if (newRatings.length === 0) {
    return item;
  }

  return {
    ...item,
    ratings: [...item.ratings, ...newRatings],
  };
}
"""

search_code = """import { MediaItem, MediaType, UserPreferences } from '@/shared/types';
import { BASE_URL, getTmdbApiKey, fetchWithRetry, makeBearerHeaders } from './client';
import { TmdbSearchDetails, TmdbSearchResult, mapTmdbToMediaItem } from './mappers';
import { CACHE, CACHE_TTL } from './cache';
import { loadGenreMap } from './genres';
import { enrichMediaWithOmdbRatings, enrichMediaWithStreaming } from './enrichment';
import { runWithConcurrency } from '../omdb';

/**
 * Searches TMDb for a movie or TV show.
 */
export async function searchTitle(
  title: string,
  yearGuess?: number,
  typeGuess?: MediaType
): Promise<MediaItem | null> {
  const genreMap = await loadGenreMap();
  const cacheKey = `search_${title}_${yearGuess}_${typeGuess}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem | null;
  }

  const authOpts = makeBearerHeaders(getTmdbApiKey());

  const searchMovie = async () => {
    let url = `${BASE_URL}/search/movie?query=${encodeURIComponent(title)}&include_adult=false`;
    if (yearGuess) url += `&primary_release_year=${yearGuess}`;
    
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb Movie API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return { data, type: 'movie' as MediaType };
  };

  const searchTv = async () => {
    let url = `${BASE_URL}/search/tv?query=${encodeURIComponent(title)}&include_adult=false`;
    if (yearGuess) url += `&first_air_date_year=${yearGuess}`;
    
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb TV API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return { data, type: 'tv' as MediaType };
  };

  try {
    let bestResult: TmdbSearchDetails | undefined;
    let finalType: MediaType = 'movie';

    if (typeGuess === 'movie') {
      const { data } = await searchMovie();
      bestResult = data.results[0];
    } else if (typeGuess === 'tv') {
      const { data } = await searchTv();
      bestResult = data.results[0];
    } else {
      const [movieData, tvData] = await Promise.all([searchMovie(), searchTv()]);
      
      const mMatch = movieData.data.results[0];
      const tMatch = tvData.data.results[0];

      if (mMatch && tMatch) {
        if (tMatch.vote_count > mMatch.vote_count * 2) {
          bestResult = tMatch;
          finalType = 'tv';
        } else {
          bestResult = mMatch;
          finalType = 'movie';
        }
      } else if (mMatch) {
        bestResult = mMatch;
        finalType = 'movie';
      } else if (tMatch) {
        bestResult = tMatch;
        finalType = 'tv';
      }
    }

    if (!bestResult) return null;

    const releaseDate =
      (finalType === 'movie' ? bestResult.release_date : bestResult.first_air_date) || undefined;
    const baseItem = mapTmdbToMediaItem(bestResult, finalType, genreMap);
    const withRatings = await enrichMediaWithOmdbRatings(baseItem);
    const resultItem = await enrichMediaWithStreaming(withRatings, undefined, releaseDate);
    CACHE.set(cacheKey, { data: resultItem, timestamp: Date.now() });
    return resultItem;
  } catch (err) {
    console.error('[Subsume TMDB] Search failed', err);
    return null;
  }
}

export async function searchTitles(
  query: string,
  type?: MediaType,
  year?: number
): Promise<MediaItem[]> {
  const genreMap = await loadGenreMap();
  const cacheKey = `search_multi_${query}_${type}_${year}`;
  const cached = CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as MediaItem[] || [];
  }

  const authOpts = makeBearerHeaders(getTmdbApiKey());

  const searchMovie = async () => {
    let url = `${BASE_URL}/search/movie?query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    if (year) url += `&primary_release_year=${year}`;
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb Movie API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return data.results.map((r) => mapTmdbToMediaItem(r, 'movie', genreMap));
  };

  const searchTv = async () => {
    let url = `${BASE_URL}/search/tv?query=${encodeURIComponent(query)}&include_adult=false&page=1`;
    if (year) url += `&first_air_date_year=${year}`;
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error(`TMDb TV API error: ${res.status}`);
    const data: TmdbSearchResult = await res.json();
    return data.results.map((r) => mapTmdbToMediaItem(r, 'tv', genreMap));
  };

  try {
    let results: MediaItem[] = [];

    if (type === 'movie') {
      results = await searchMovie();
    } else if (type === 'tv') {
      results = await searchTv();
    } else {
      const [movies, tvShows] = await Promise.all([searchMovie(), searchTv()]);
      results = [...movies, ...tvShows];
    }

    results.sort((a, b) => {
      const aVotes = a.ratings.find((r) => r.provider === 'tmdb')?.votes || 0;
      const bVotes = b.ratings.find((r) => r.provider === 'tmdb')?.votes || 0;
      return bVotes - aVotes;
    });

    const limited = await runWithConcurrency(
      results.slice(0, 10),
      enrichMediaWithOmdbRatings,
      3
    );
    CACHE.set(cacheKey, { data: limited, timestamp: Date.now() });
    return limited;
  } catch (err) {
    console.error('[Subsume TMDB] Multi-search failed', err);
    return [];
  }
}

/**
 * Helper to get a date string for recent releases
 */
function getRecentDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

/**
 * Fetches the latest trending or currently airing titles.
 */
export async function getLatestReleases(
  type: 'movie' | 'tv',
  prefs?: UserPreferences,
  recentDays: number = 60
): Promise<MediaItem[]> {
  const genreMap = await loadGenreMap();
  let url = `${BASE_URL}`;
  
  const authOpts = makeBearerHeaders(getTmdbApiKey());

  if (prefs && (prefs.favoriteGenres.length > 0 || prefs.platforms.length > 0 || recentDays !== 60)) {
    url += `/discover/${type}?language=en-US&page=1&sort_by=popularity.desc`;
    
    // Restrict to recent releases
    const recentDate = getRecentDate(recentDays);
    if (type === 'movie') {
      url += `&primary_release_date.gte=${recentDate}&primary_release_date.lte=${getRecentDate(0)}`;
    } else {
      url += `&air_date.gte=${recentDate}&air_date.lte=${getRecentDate(0)}`;
    }

    if (prefs.favoriteGenres.length > 0) {
      url += `&with_genres=${prefs.favoriteGenres.join('|')}`;
    }
    if (prefs.platforms.length > 0) {
      url += `&with_watch_providers=${prefs.platforms.join('|')}&watch_region=${prefs.region || 'US'}`;
    }
  } else {
    const endpoint = type === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
    url += `${endpoint}?language=en-US&page=1`;
  }
  
  try {
    const res = await fetchWithRetry(url, 3, 500, authOpts);
    if (!res.ok) throw new Error('Failed to fetch latest releases');
    const data: TmdbSearchResult = await res.json();
    
    const prefsRegion = prefs?.region || 'US';
    const bases = data.results.map((r) => {
      const releaseDate = (type === 'movie' ? r.release_date : r.first_air_date) || undefined;
      return { base: mapTmdbToMediaItem(r, type, genreMap), releaseDate };
    });
    const withRatings = await runWithConcurrency(
      bases,
      async ({ base }) => enrichMediaWithOmdbRatings(base),
      3
    );
    const items = await Promise.all(
      withRatings.map((item, index) =>
        enrichMediaWithStreaming(item, prefsRegion, bases[index].releaseDate)
      )
    );
    return items;
  } catch (err) {
    console.error('TMDb Latest Releases Error:', err);
    return [];
  }
}
"""

person_code = """import { CrewRole, MediaItem } from '@/shared/types';
import { BASE_URL, POSTER_BASE_URL, fetchWithRetry, makeBearerHeaders } from './client';
import { getAllMediaMap, putMediaItems } from '../storage';

/**
 * Searches TMDb for a person (actor/crew).
 */
export async function searchPerson(
  query: string,
  apiKey: string
): Promise<Array<{
  id: string;
  name: string;
  knownForDepartment: string;
  profilePath: string | null;
  knownFor: Array<{ title: string; mediaType: 'movie' | 'tv' }>;
}>> {
  const url = `${BASE_URL}/search/person?query=${encodeURIComponent(query)}&include_adult=false`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person search API error: ${res.status}`);
  const data = await res.json();
  
  return (data.results || []).map((p: any) => {
    const knownFor = (p.known_for || []).map((kf: any) => ({
      title: (kf.media_type === 'movie' ? kf.title : kf.name) || 'Unknown Title',
      mediaType: kf.media_type as 'movie' | 'tv'
    }));
    
    return {
      id: p.id?.toString() || '',
      name: p.name || 'Unknown Name',
      knownForDepartment: p.known_for_department || '',
      profilePath: p.profile_path || null,
      knownFor
    };
  });
}

/**
 * Fetches standard details for a person.
 */
export async function fetchPersonDetails(
  personId: string,
  apiKey: string
): Promise<{ biography: string; biographyData?: string; birthday: string; profilePath: string | null }> {
  const url = `${BASE_URL}/person/${personId}`;
  const res = await fetchWithRetry(url, 3, 500, makeBearerHeaders(apiKey));
  if (!res.ok) throw new Error(`TMDb Person Details API error: ${res.status}`);
  const data = await res.json();
  return {
    biography: data.biography || '',
    birthday: data.birthday || '',
    profilePath: data.profile_path || null,
  };
}

/**
 * Fetches complete filmography of a person, filtering by their CrewRole.
 */
export async function fetchPersonFilmography(
  personId: string,
  role: CrewRole,
  apiKey: string
): Promise<Array<{
  tmdbId: string;
  title: string;
  year: number;
  mediaType: 'movie' | 'tv';
  posterPath: string | null;
  voteAverage: number;
}>> {
  const personAuthOpts = makeBearerHeaders(apiKey);
  const [movieRes, tvRes] = await Promise.all([
    fetchWithRetry(`${BASE_URL}/person/${personId}/movie_credits?language=en-US`, 3, 500, personAuthOpts),
    fetchWithRetry(`${BASE_URL}/person/${personId}/tv_credits?language=en-US`, 3, 500, personAuthOpts),
  ]);

  if (!movieRes.ok) throw new Error(`TMDb movie credits error: ${movieRes.status}`);
  if (!tvRes.ok) throw new Error(`TMDb tv credits error: ${tvRes.status}`);

  const movieData = await movieRes.json();
  const tvData = await tvRes.json();

  let rawMovieItems: any[] = [];
  let rawTvItems: any[] = [];

  if (role === 'actor') {
    rawMovieItems = movieData.cast || [];
    rawTvItems = tvData.cast || [];
  } else {
    let jobTitles: string[] = [];
    if (role === 'director') jobTitles = ['Director'];
    else if (role === 'writer') jobTitles = ['Screenplay', 'Writer', 'Story'];
    else if (role === 'cinematographer') jobTitles = ['Director of Photography'];
    else if (role === 'composer') jobTitles = ['Original Music Composer'];
    else if (role === 'editor') jobTitles = ['Editor'];
    else if (role === 'producer') jobTitles = ['Producer'];

    rawMovieItems = (movieData.crew || []).filter((c: any) => jobTitles.includes(c.job));
    rawTvItems = (tvData.crew || []).filter((c: any) => jobTitles.includes(c.job));
  }

  const movies = rawMovieItems.map((item: any) => {
    const releaseDate = item.release_date || '';
    const year = releaseDate ? parseInt(releaseDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.title || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'movie' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const tvs = rawTvItems.map((item: any) => {
    const firstAirDate = item.first_air_date || '';
    const year = firstAirDate ? parseInt(firstAirDate.substring(0, 4), 10) : 0;
    return {
      tmdbId: item.id?.toString() || '',
      title: item.name || 'Unknown Title',
      year: isNaN(year) ? 0 : year,
      mediaType: 'tv' as const,
      posterPath: item.poster_path || null,
      voteAverage: item.vote_average || 0
    };
  });

  const combined = [...movies, ...tvs];
  const seen = new Set<string>();
  const deduped: Array<{
    tmdbId: string;
    title: string;
    year: number;
    mediaType: 'movie' | 'tv';
    posterPath: string | null;
    voteAverage: number;
  }> = [];

  for (const item of combined) {
    if (!seen.has(item.tmdbId)) {
      seen.add(item.tmdbId);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => b.year - a.year);

  const mediaIds = deduped.map((item) => `tmdb_${item.mediaType}_${item.tmdbId}`);
  const existingMap = await getAllMediaMap(mediaIds);
  const newItems: MediaItem[] = [];

  for (const item of deduped) {
    const mediaId = `tmdb_${item.mediaType}_${item.tmdbId}`;
    if (!existingMap[mediaId]) {
      newItems.push({
        id: mediaId,
        canonicalTitle: item.title,
        type: item.mediaType,
        year: item.year,
        genres: [],
        ratings: [
          {
            provider: 'tmdb',
            score: item.voteAverage,
            votes: 0,
          },
        ],
        providers: [
          {
            provider: 'tmdb',
            externalId: item.tmdbId,
            url: `https://www.themoviedb.org/${item.mediaType}/${item.tmdbId}`,
          },
        ],
        posterUrl: item.posterPath ? `${POSTER_BASE_URL}${item.posterPath}` : '',
        overview: '',
      });
    }
  }

  if (newItems.length > 0) {
    await putMediaItems(newItems);
  }

  return deduped;
}
"""

tmdb_facade_code = """import { setApiKey as clientSetApiKey } from './tmdb/client';
import { loadGenreMap } from './tmdb/genres';

export { POSTER_BASE_URL, fetchWithRetry, makeBearerHeaders } from './tmdb/client';
export { mapWatchProvidersResponse } from './tmdb/mappers';
export type { TmdbWatchProvidersResponse, MapWatchProvidersOptions } from './tmdb/mappers';
export { fetchWatchProviders } from './tmdb/streaming';
export { enrichMediaWithStreaming, enrichMediaWithOmdbRatings } from './tmdb/enrichment';
export { searchTitle, searchTitles, getLatestReleases } from './tmdb/search';
export { searchPerson, fetchPersonDetails, fetchPersonFilmography } from './tmdb/person';

export function setTmdbApiKey(key: string): void {
  clientSetApiKey(key);
  loadGenreMap().catch(() => {});
}
"""

with open('src/background/tmdb/genres.ts', 'w') as f:
    f.write(genres_code)
with open('src/background/tmdb/enrichment.ts', 'w') as f:
    f.write(enrichment_code)
with open('src/background/tmdb/search.ts', 'w') as f:
    f.write(search_code)
with open('src/background/tmdb/person.ts', 'w') as f:
    f.write(person_code)
with open('src/background/tmdb.ts', 'w') as f:
    f.write(tmdb_facade_code)

print("Files written successfully")
