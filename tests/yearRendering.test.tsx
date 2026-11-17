import { h, render } from 'preact';
import { describe, it, expect } from 'vitest';
import type { MediaItem } from '@/shared/types';
import { SanctuaryMediaCard } from '@/ui/components/SanctuaryMediaCard';
import { RecommendationMediaCard } from '@/ui/components/RecommendationMediaCard';
import { yearOrUnknown } from '@/shared/year';

const base: MediaItem = { id: 'openlibrary_work_OL9W', canonicalTitle: 'Gap', type: 'book', year: null, genres: [], ratings: [], providers: [], posterUrl: '' };

describe('unknown year is a designed gap', () => {
  it('helper', () => {
    expect(yearOrUnknown(null)).toBe('Year unknown');
    expect(yearOrUnknown(0)).toBe('Year unknown');
    expect(yearOrUnknown(1488)).toBe('1488');
  });
  it('sanctuary card and recommendation card show "Year unknown", never 0', () => {
    const c = document.createElement('div');
    document.body.appendChild(c);
    render(<div><SanctuaryMediaCard media={base} /><RecommendationMediaCard media={base} explanation="x" onClick={() => {}} /></div>, c);
    expect(c.textContent).toContain('Year unknown');
    expect(c.querySelectorAll('[data-year-unknown="true"]').length).toBe(2);
    expect(c.textContent).not.toMatch(/(^|\s)0(\s|$)/);
  });
});
