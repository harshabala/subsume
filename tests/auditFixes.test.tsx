/** Fixes from the 2026-11-16 page audit: page count from the resolved edition; no "0" for unknown years. */
import { h, render } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { MessageType, type MediaItem } from '@/shared/types';
import { bookHandlers } from '@/background/handlers/books';
import * as openLibrary from '@/background/openLibrary';
import { RecommendationMediaCard } from '@/ui/components/RecommendationMediaCard';

vi.mock('@/background/openLibrary', () => ({
  searchOpenLibrary: vi.fn(),
  resolveOpenLibraryIsbn: vi.fn(),
  getOpenLibraryWork: vi.fn(),
  getOpenLibraryEditionsForWork: vi.fn(),
}));
vi.mock('@/background/googleBooks', () => ({ searchGoogleBooks: vi.fn() }));

describe('audit fixes', () => {
  it('RESOLVE_PAGE_CANDIDATE copies the edition page count onto the media record', async () => {
    vi.mocked(openLibrary.resolveOpenLibraryIsbn).mockResolvedValue({
      work: {
        id: 'openlibrary_work_OL1W', medium: 'book', canonicalTitle: 'Paged', firstReleaseYear: 1999,
        genres: [], images: {}, externalIds: [], creatorCredits: [], bookDetails: { authors: ['A'] },
        sourceProvenance: [], sourceConfidence: 'high', createdAt: 1, updatedAt: 1,
      },
      edition: {
        id: 'openlibrary_edition_OL1M', workId: 'openlibrary_work_OL1W', title: 'Paged', authors: ['A'],
        providerIds: [], pageCount: 321, sourceProvenance: [], sourceConfidence: 'high',
      },
    });
    const res = (await bookHandlers[MessageType.RESOLVE_PAGE_CANDIDATE](
      { medium: 'book', title: 'Paged', isbn13: ['9780743273565'], confidence: 0.9, sourcePageUrl: 'https://x.test', evidence: [] },
      {} as chrome.runtime.MessageSender,
    )) as { resolved: boolean; media: MediaItem };
    expect(res.resolved).toBe(true);
    expect(res.media.pageCount).toBe(321);
  });

  it('recommendation card does not print 0 for an unknown year', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    const media: MediaItem = { id: 'openlibrary_work_OL2W', canonicalTitle: 'Yearless', type: 'book', year: 0, genres: [], ratings: [], providers: [], posterUrl: '' };
    render(<RecommendationMediaCard media={media} explanation="x" onClick={() => {}} />, c);
    const meta = c.querySelector('.media-card-meta')!;
    expect(Array.from(meta.querySelectorAll('span')).map((s) => s.textContent)).not.toContain('0');
  });
});
