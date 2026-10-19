import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchTitle, setTmdbApiKey, isMissingTmdbKeyError } from '@/background/tmdb';
import { DEFAULT_PREFS, savePreferences } from '@/background/storage';

describe('TMDb with no API key (free path)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    setTmdbApiKey('');
    await savePreferences({ ...DEFAULT_PREFS, tmdbApiKey: '' });
  });

  it('does not console.error the genre map or hit the network', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const err = await searchTitle('Inception', 2010, 'movie').catch((e: unknown) => e);

    expect(isMissingTmdbKeyError(err)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('isMissingTmdbKeyError is false for other failures', () => {
    expect(isMissingTmdbKeyError(new Error('Network down'))).toBe(false);
    expect(isMissingTmdbKeyError(undefined)).toBe(false);
  });
});
