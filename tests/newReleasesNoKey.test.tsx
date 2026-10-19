import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/preact';
import { NewReleases } from '@/ui/pages/NewReleases';
import { TMDB_KEY_MISSING_MESSAGE } from '@/shared/productCopy';
import * as messages from '@/shared/messages';

describe('Now Showing without a TMDb key', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('explains the missing key and links to Settings instead of a fake outage', async () => {
    vi.spyOn(messages, 'sendMessage').mockImplementation(async (type) => {
      if (type === 'GET_LATEST_RELEASES') throw new Error(TMDB_KEY_MISSING_MESSAGE);
      return { success: true, data: undefined };
    });
    const onOpenSettings = vi.fn();

    render(<NewReleases onOpenSettings={onOpenSettings} />);

    const button = await screen.findByRole('button', { name: /open settings/i });
    expect(screen.getByText(/free TMDb key/i)).toBeTruthy();
    expect(screen.queryByText(/503/)).toBeNull();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
    fireEvent.click(button);
    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('keeps the retry state for real network failures', async () => {
    vi.spyOn(messages, 'sendMessage').mockImplementation(async (type) => {
      if (type === 'GET_LATEST_RELEASES') throw new Error('Failed to fetch');
      return { success: true, data: undefined };
    });

    render(<NewReleases />);

    expect(await screen.findByRole('button', { name: /try again/i })).toBeTruthy();
    expect(screen.queryByText(/503/)).toBeNull();
  });
});
