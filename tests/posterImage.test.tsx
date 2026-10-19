import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/preact';
import { PosterImage } from '@/ui/components/PosterImage';

const fallback = <div data-testid="poster-fallback">Dune</div>;

describe('PosterImage', () => {
  it('renders the image when a src is given', () => {
    const { container, queryByTestId } = render(
      <PosterImage src="https://image.tmdb.org/p.jpg" alt="Dune" className="poster" fallback={fallback} />,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://image.tmdb.org/p.jpg');
    expect(img?.className).toBe('poster');
    expect(queryByTestId('poster-fallback')).toBeNull();
  });

  it('renders the fallback when src is missing', () => {
    const { container, getByTestId } = render(<PosterImage src={undefined} alt="" fallback={fallback} />);
    expect(container.querySelector('img')).toBeNull();
    expect(getByTestId('poster-fallback')).toBeTruthy();
  });

  it('swaps to the fallback instead of a broken-image glyph when loading fails', () => {
    const { container, getByTestId } = render(
      <PosterImage src="https://image.tmdb.org/missing.jpg" alt="" fallback={fallback} />,
    );
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(getByTestId('poster-fallback')).toBeTruthy();
  });

  it('tries again when the src changes after a failure', () => {
    const { container, rerender } = render(<PosterImage src="https://a/1.jpg" alt="" fallback={fallback} />);
    fireEvent.error(container.querySelector('img')!);
    rerender(<PosterImage src="https://a/2.jpg" alt="" fallback={fallback} />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://a/2.jpg');
  });
});
