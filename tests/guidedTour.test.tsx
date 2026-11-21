import { h } from 'preact';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { GuidedTour, GUIDED_TOUR_STEPS } from '@/ui/components/GuidedTour';

describe('GuidedTour', () => {
  it('renders step 1 (Save a title) by default with progress indicators', () => {
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();

    render(<GuidedTour onDismiss={onDismiss} onNavigate={onNavigate} />);

    expect(screen.getByTestId('guided-tour-dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /save a title/i })).toBeInTheDocument();
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip guide/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try search/i })).toBeInTheDocument();
  });

  it('navigates through all 4 steps: save, library, search, stats', () => {
    const onDismiss = vi.fn();
    const onNavigate = vi.fn();

    render(<GuidedTour onDismiss={onDismiss} onNavigate={onNavigate} />);

    // Step 1: Save a title
    expect(screen.getByRole('heading', { name: /save a title/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 2: Find in library
    expect(screen.getByRole('heading', { name: /find it in your library/i })).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 3: Fast search
    expect(screen.getByRole('heading', { name: /fast, private search/i })).toBeInTheDocument();
    expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    // Step 4: See stats
    expect(screen.getByRole('heading', { name: /see your stats/i })).toBeInTheDocument();
    expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /finish tour/i })).toBeInTheDocument();
  });

  it('navigates back to previous step', () => {
    render(<GuidedTour onDismiss={vi.fn()} onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
  });

  it('skip button triggers onDismiss', () => {
    const onDismiss = vi.fn();
    render(<GuidedTour onDismiss={onDismiss} onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /skip guide/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('finish button on final step triggers onDismiss', () => {
    const onDismiss = vi.fn();
    render(<GuidedTour onDismiss={onDismiss} onNavigate={vi.fn()} />);

    // Go to step 4
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /finish tour/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('action buttons trigger page navigation', () => {
    const onNavigate = vi.fn();
    render(<GuidedTour onDismiss={vi.fn()} onNavigate={onNavigate} />);

    // Step 1 action -> search
    fireEvent.click(screen.getByRole('button', { name: /try search/i }));
    expect(onNavigate).toHaveBeenCalledWith('search');

    // Step 2 action -> library
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /open library/i }));
    expect(onNavigate).toHaveBeenCalledWith('library');

    // Step 4 action -> stats
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /view stats/i }));
    expect(onNavigate).toHaveBeenCalledWith('stats');
  });

  it('has exact 4 steps defined matching North Star plan', () => {
    expect(GUIDED_TOUR_STEPS).toHaveLength(4);
    expect(GUIDED_TOUR_STEPS.map((s) => s.id)).toEqual(['save', 'library', 'search', 'stats']);
  });
});
