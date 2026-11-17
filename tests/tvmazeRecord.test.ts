import { describe, it, expect, vi } from 'vitest';
import recorded from './fixtures/audit/recorded/responses.json';
import { searchTvMazeMulti } from '@/background/tvmaze';

const REC = recorded as unknown as Record<string, { body: unknown }>;

describe('TVmaze mapping against a real recorded response', () => {
  it('keeps network and runtime with a recorded source', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(JSON.stringify(REC[url]?.body ?? []), { status: 200 })));
    const items = await searchTvMazeMulti('sacred games');
    const sg = items.find((i) => i.canonicalTitle === 'Sacred Games')!;
    expect(sg.network).toBe('Netflix');
    expect(sg.runtimeMinutes).toBe(50);
    expect(sg.fieldSources?.network).toMatch(/^tvmaze:/);
    vi.unstubAllGlobals();
  });
});
