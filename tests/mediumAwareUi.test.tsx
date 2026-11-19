/**
 * Unit tests for medium-aware UI behavior added in North Star workstream 3:
 * - Medium-aware creator line on SanctuaryMediaCard (By / Directed by / Created by)
 * - DetailModal runtime (movies) vs page count (books)
 * - HardcoverSpineCard publication year
 * - Stats honest calculations without misleading zeros
 */
import { h, render } from 'preact';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MediaItem, LibraryItem } from '@/shared/types';
import { SanctuaryMediaCard } from '@/ui/components/SanctuaryMediaCard';
import { HardcoverSpineCard } from '@/ui/components/archive/HardcoverSpineCard';
import { DetailModal } from '@/ui/components/DetailModal';
import { Stats } from '@/ui/pages/Stats';
import * as messaging from '@/shared/messages';

vi.mock('@/shared/messages', () => ({
  sendMessage: vi.fn(),
}));

describe('medium-aware UI behavior', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    vi.clearAllMocks();
  });

  describe('SanctuaryMediaCard creator line', () => {
    it('renders "By {author}" for books with authors', () => {
      const book: MediaItem = {
        id: 'openlibrary_work_OL1W',
        canonicalTitle: 'The Dispossessed',
        type: 'book',
        year: 1974,
        authors: ['Ursula K. Le Guin'],
        genres: ['Science Fiction'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<SanctuaryMediaCard media={book} />, container);
      const creator = container.querySelector('.sanctuary-card-creator');
      expect(creator).not.toBeNull();
      expect(creator?.textContent).toBe('By Ursula K. Le Guin');
    });

    it('renders "Directed by {director}" for movies with director info', () => {
      const movie: MediaItem = {
        id: 'tmdb_movie_129',
        canonicalTitle: 'Spirited Away',
        type: 'movie',
        year: 2001,
        wikidataDirectorBio: 'Hayao Miyazaki, Japanese animator and filmmaker',
        genres: ['Animation'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<SanctuaryMediaCard media={movie} />, container);
      const creator = container.querySelector('.sanctuary-card-creator');
      expect(creator).not.toBeNull();
      expect(creator?.textContent).toBe('Directed by Hayao Miyazaki');
    });

    it('renders "Created by {creator}" for series with creator info', () => {
      const tv: MediaItem = {
        id: 'tmdb_tv_192',
        canonicalTitle: 'Twin Peaks',
        type: 'tv',
        year: 1990,
        wikidataDirectorBio: 'David Lynch, American filmmaker',
        genres: ['Mystery'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<SanctuaryMediaCard media={tv} />, container);
      const creator = container.querySelector('.sanctuary-card-creator');
      expect(creator).not.toBeNull();
      expect(creator?.textContent).toBe('Created by David Lynch');
    });

    it('does not render creator line when creator info is missing', () => {
      const unknownFilm: MediaItem = {
        id: 'tmdb_movie_9999',
        canonicalTitle: 'Unknown Film',
        type: 'movie',
        year: 1950,
        genres: [],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<SanctuaryMediaCard media={unknownFilm} />, container);
      const creator = container.querySelector('.sanctuary-card-creator');
      expect(creator).toBeNull();
    });
  });

  describe('HardcoverSpineCard publication year', () => {
    it('renders the publication year and creator on the spine card', () => {
      const book: MediaItem = {
        id: 'openlibrary_work_OL2W',
        canonicalTitle: 'Dune',
        type: 'book',
        year: 1965,
        authors: ['Frank Herbert'],
        genres: ['Sci-Fi'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      const libItem: LibraryItem = {
        id: 'lib_1',
        mediaId: book.id,
        status: 'watching',
        addedAt: 1,
        updatedAt: 1,
      };
      render(
        <HardcoverSpineCard
          library={libItem}
          media={book}
          onSelect={() => {}}
          onUpdateStatus={() => {}}
          onUpdateRating={() => {}}
          onRemoveItem={() => {}}
          removeConfirmId={null}
          setRemoveConfirmId={() => {}}
        />,
        container,
      );
      const creator = container.querySelector('.media-card-creator');
      expect(creator).not.toBeNull();
      expect(creator?.textContent).toBe('By Frank Herbert');

      const meta = container.querySelector('.media-card-meta');
      expect(meta).not.toBeNull();
      expect(meta?.textContent).toContain('1965');
    });
  });

  describe('DetailModal medium-specific measurements', () => {
    it('displays runtime for films and not page count', () => {
      const movie: MediaItem = {
        id: 'tmdb_movie_550',
        canonicalTitle: 'Fight Club',
        type: 'movie',
        year: 1999,
        runtimeMinutes: 139,
        genres: ['Drama'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<DetailModal media={movie} isOpen={true} onClose={() => {}} onSave={() => {}} />, container);
      const runtime = container.querySelector('.sanctuary-detail-runtime');
      expect(runtime).not.toBeNull();
      expect(runtime?.textContent).toBe('139 min');
      const pages = container.querySelector('.sanctuary-detail-pages');
      expect(pages).toBeNull();
    });

    it('displays page count for books and not runtime', () => {
      const book: MediaItem = {
        id: 'openlibrary_work_OL3W',
        canonicalTitle: 'Left Hand of Darkness',
        type: 'book',
        year: 1969,
        pageCount: 304,
        genres: ['Science Fiction'],
        ratings: [],
        providers: [],
        posterUrl: '',
      };
      render(<DetailModal media={book} isOpen={true} onClose={() => {}} onSave={() => {}} />, container);
      const pages = container.querySelector('.sanctuary-detail-pages');
      expect(pages).not.toBeNull();
      expect(pages?.textContent).toBe('304 pages');
      const runtime = container.querySelector('.sanctuary-detail-runtime');
      expect(runtime).toBeNull();
    });
  });

  describe('Stats honest calculations and missing data states', () => {
    it('displays "(unknown for N titles)" instead of zero when film runtime is missing', async () => {
      const mockItems = [
        {
          library: { id: 'lib_1', mediaId: 'film_1', status: 'watched' as const, addedAt: 1, updatedAt: 1 },
          media: { id: 'film_1', canonicalTitle: 'No Runtime Film', type: 'movie' as const, year: 2020, runtimeMinutes: undefined, genres: [], ratings: [], providers: [], posterUrl: '' },
        },
      ];
      vi.mocked(messaging.sendMessage).mockResolvedValue({ success: true, data: mockItems });

      render(<Stats />, container);
      // Wait for state resolution
      await new Promise(r => setTimeout(r, 10));

      const statsText = container.textContent || '';
      expect(statsText).toContain('hrs on screen');
      expect(statsText).toContain('(unknown for 1 title)');
      expect(statsText).not.toMatch(/0 hrs on screen/);
    });

    it('displays "(unknown for N titles)" when finished book has unknown page count', async () => {
      const mockItems = [
        {
          library: { id: 'lib_2', mediaId: 'book_1', status: 'watched' as const, addedAt: 1, updatedAt: 1 },
          media: { id: 'book_1', canonicalTitle: 'No Pages Book', type: 'book' as const, year: 2021, pageCount: undefined, genres: [], ratings: [], providers: [], posterUrl: '' },
        },
      ];
      vi.mocked(messaging.sendMessage).mockResolvedValue({ success: true, data: mockItems });

      render(<Stats />, container);
      // Wait for state resolution
      await new Promise(r => setTimeout(r, 50));

      const statsText = container.textContent || '';
      expect(statsText).toContain('pages among them');
      expect(statsText).toContain('(unknown for 1 title)');
      expect(statsText).not.toMatch(/0 pages among them/);
    });
  });
});
