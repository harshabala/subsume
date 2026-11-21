import { sendMessage } from '@/shared/messages';
import { MessageType } from '@/shared/types';
import type { JoinedItem } from '../components/archive/types';

export type JoinedLibraryItem = JoinedItem;

/**
 * Loads the current library. Per owner decision (2026-11-21), first-time users
 * see demo titles in their library so the sanctuary is never empty on arrival.
 */
export async function ensureDemoLibraryIfEmpty(): Promise<JoinedLibraryItem[]> {
  const initial = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
    MessageType.GET_LIBRARY,
    {}
  );
  if (!initial.data || initial.data.length === 0) {
    return restoreDemoLibrary();
  }
  return initial.data;
}

/**
 * Explicit opt-in: restore the demo sanctuary library.
 * Prefer calling this only from a user-initiated control.
 */
export async function restoreDemoLibrary(): Promise<JoinedLibraryItem[]> {
  await sendMessage(MessageType.RESTORE_DEMO_LIBRARY, {});
  const refreshed = await sendMessage<Record<string, unknown>, JoinedLibraryItem[]>(
    MessageType.GET_LIBRARY,
    {}
  );
  return refreshed.data ?? [];
}

/**
 * Practice-title path for first-inscription CTAs.
 * There is no single-item seed API — RESTORE_DEMO_LIBRARY seeds the full demo
 * catalogue only when the media store is empty, then returns library rows.
 * Caller should open capture/search for the first mediaId.
 */
export async function seedPracticeLibraryIfEmpty(): Promise<JoinedLibraryItem[]> {
  const existing = await ensureDemoLibraryIfEmpty();
  if (existing.length > 0) {
    return existing;
  }
  return restoreDemoLibrary();
}
