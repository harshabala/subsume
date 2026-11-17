import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MediaItem, LibraryItem, PersonItem } from '@/shared/types';
import type { IDBPDatabase } from 'idb';

const openConnections: IDBPDatabase[] = [];

vi.mock('idb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('idb')>();
  return {
    ...actual,
    openDB: async (...args: Parameters<typeof actual.openDB>) => {
      const db = await actual.openDB(...args);
      openConnections.push(db);
      return db;
    },
  };
});

/** Prevent auto-seed from filling the DB during migration tests. */
vi.mock('@/background/seedData', () => ({
  SEED_MEDIA: [],
  SEED_LIBRARY: [],
  SEED_PEOPLE: [],
  SEED_PEOPLE_OBSOLETE_IDS: [],
  SEED_CATALOGUE_VERSION: 1,
  SEED_CATALOGUE_VERSION_KEY: 'subsume_seed_catalogue_version',
}));

const DB_NAME = 'subsume-db';

async function openV3Db(): Promise<IDBPDatabase> {
  const { openDB } = await import('idb');
  return openDB(DB_NAME, 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('by-canonical', 'canonicalTitle');
        const libraryStore = db.createObjectStore('library', { keyPath: 'mediaId' });
        libraryStore.createIndex('by-status', 'status');
        libraryStore.createIndex('by-added', 'addedAt');
        libraryStore.createIndex('by-updated', 'updatedAt');
        db.createObjectStore('preferences');
      }
      if (oldVersion < 2) {
        const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
        peopleStore.createIndex('by-followed', 'followedAt');
        peopleStore.createIndex('by-name', 'name');
      }
      if (oldVersion < 3) {
        const alertsStore = db.createObjectStore('alerts', { keyPath: 'id' });
        alertsStore.createIndex('by-created', 'createdAt');
      }
    },
  });
}

async function closeTrackedConnections(): Promise<void> {
  while (openConnections.length > 0) {
    const db = openConnections.pop();
    db?.close();
  }
}

async function resetStorageState(): Promise<void> {
  await closeTrackedConnections();
  vi.resetModules();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
    request.onsuccess = () => resolve();
  });
  // Fresh chrome.storage.local mock (no migration flag).
  const store: Record<string, unknown> = {};
  vi.mocked(chrome.storage.local.get).mockImplementation(async (keys?: string | string[] | null) => {
    if (!keys) return { ...store };
    if (typeof keys === 'string') return { [keys]: store[keys] };
    if (Array.isArray(keys)) {
      const out: Record<string, unknown> = {};
      for (const k of keys) out[k] = store[k];
      return out;
    }
    return { ...store };
  });
  vi.mocked(chrome.storage.local.set).mockImplementation(async (items: Record<string, unknown>) => {
    Object.assign(store, items);
  });
}

async function loadStorage() {
  return import('@/background/storage');
}


describe('year handling (unknown = null, pre-1800 valid)', () => {
  beforeEach(async () => {
    openConnections.length = 0;
    await resetStorageState();
  });
  afterEach(async () => {
    await closeTrackedConnections();
    vi.resetModules();
  });

  it('validator accepts null and pre-1800 years, rejects nonsense', async () => {
    const { isValidMediaItem } = await loadStorage();
    const base = { id: 'openlibrary_work_OL1W', canonicalTitle: 'T', type: 'book', genres: [], ratings: [], providers: [], posterUrl: '' };
    expect(isValidMediaItem({ ...base, year: null })).toBe(true);
    expect(isValidMediaItem({ ...base, year: 1488 })).toBe(true);
    expect(isValidMediaItem({ ...base, year: 1605 })).toBe(true);
    expect(isValidMediaItem({ ...base, year: 2101 })).toBe(false);
    expect(isValidMediaItem({ ...base, year: 'x' })).toBe(false);
    expect(isValidMediaItem({ ...base, year: 1.5 })).toBe(false);
  });

  it('putMediaItem stores a legacy year 0 as null', async () => {
    const storage = await loadStorage();
    await storage.putMediaItem({ id: 'openlibrary_work_OL2W', canonicalTitle: 'Legacy', type: 'book', year: 0, genres: [], ratings: [], providers: [], posterUrl: '' });
    expect((await storage.getMediaItem('openlibrary_work_OL2W'))?.year).toBeNull();
  });

  it('upgrade to v5 rewrites existing year-0 media to null and keeps real years', async () => {
    const v3 = await openV3Db();
    await v3.put('media', { id: 'openlibrary_work_OL3W', canonicalTitle: 'Zero', type: 'book', year: 0, genres: [], ratings: [], providers: [], posterUrl: '' });
    await v3.put('media', { id: 'openlibrary_work_OL4W', canonicalTitle: 'Old', type: 'book', year: 1488, genres: [], ratings: [], providers: [], posterUrl: '' });
    v3.close();
    const storage = await loadStorage();
    expect((await storage.getMediaItem('openlibrary_work_OL3W'))?.year).toBeNull();
    expect((await storage.getMediaItem('openlibrary_work_OL4W'))?.year).toBe(1488);
  });

  it('catalogWorkToMediaItem maps a missing year to null', async () => {
    const { catalogWorkToMediaItem } = await import('@/shared/compatibility');
    const m = catalogWorkToMediaItem({
      id: 'openlibrary_work_OL5W', medium: 'book', canonicalTitle: 'No year', genres: [], images: {}, externalIds: [], creatorCredits: [],
      bookDetails: { authors: [] }, sourceProvenance: [], sourceConfidence: 'high', createdAt: 1, updatedAt: 1,
    });
    expect(m.year).toBeNull();
  });
});
