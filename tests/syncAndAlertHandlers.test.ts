import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageType } from '@/shared/types';

vi.mock('@/background/storage', () => ({
  exportLibraryData: vi.fn(),
  importLibraryData: vi.fn(),
  putWatchAlert: vi.fn(),
  getAllWatchAlerts: vi.fn(),
  deleteWatchAlert: vi.fn(),
  isValidWatchAlert: vi.fn(),
}));
vi.mock('@/background/context', () => ({ invalidateProfileCache: vi.fn() }));
vi.mock('@/background/drive-sync', () => ({
  connectGoogleDrive: vi.fn(),
  disconnectGoogleDrive: vi.fn(),
  getDriveConnectionStatus: vi.fn(),
  uploadDatabaseBackup: vi.fn(),
  downloadDatabaseBackup: vi.fn(),
}));
vi.mock('@/background/notifications', () => ({ clearNotificationBadge: vi.fn() }));

import { syncHandlers } from '@/background/handlers/sync';
import { alertHandlers } from '@/background/handlers/alerts';
import * as storage from '@/background/storage';
import * as drive from '@/background/drive-sync';
import { invalidateProfileCache } from '@/background/context';

const sender = {} as chrome.runtime.MessageSender;
const sync = (type: MessageType, payload: unknown = {}) => syncHandlers[type]!(payload, sender);
const alerts = (type: MessageType, payload: unknown = {}) => alertHandlers[type]!(payload, sender);

beforeEach(() => vi.clearAllMocks());

describe('sync handlers', () => {
  it('imports a valid library and refreshes the taste profile', async () => {
    expect(await sync(MessageType.IMPORT_LIBRARY, { library: [], media: [] })).toEqual({ updated: true });
    expect(storage.importLibraryData).toHaveBeenCalledOnce();
    expect(invalidateProfileCache).toHaveBeenCalledOnce();
  });

  it('rejects a malformed import without touching storage', async () => {
    await expect(sync(MessageType.IMPORT_LIBRARY, { library: 'nope' })).rejects.toThrow('"library" must be an array');
    expect(storage.importLibraryData).not.toHaveBeenCalled();
  });

  it('backs up the same export the user can download', async () => {
    vi.mocked(storage.exportLibraryData).mockResolvedValue({ schemaVersion: 2, library: [] } as never);
    expect(await sync(MessageType.BACKUP_TO_DRIVE)).toEqual({ success: true });
    expect(drive.uploadDatabaseBackup).toHaveBeenCalledWith(JSON.stringify({ schemaVersion: 2, library: [] }));
  });

  it('validates a Drive backup before restoring it', async () => {
    vi.mocked(drive.downloadDatabaseBackup).mockResolvedValue(JSON.stringify({ media: {} }));
    await expect(sync(MessageType.RESTORE_FROM_DRIVE)).rejects.toThrow('"media" must be an array');
    expect(storage.importLibraryData).not.toHaveBeenCalled();

    vi.mocked(drive.downloadDatabaseBackup).mockResolvedValue(JSON.stringify({ library: [] }));
    expect(await sync(MessageType.RESTORE_FROM_DRIVE)).toEqual({ success: true });
    expect(storage.importLibraryData).toHaveBeenCalledOnce();
  });

  it('reports Drive connect and disconnect results', async () => {
    vi.mocked(drive.connectGoogleDrive).mockResolvedValue({ email: 'a***e@example.com' } as never);
    vi.mocked(drive.disconnectGoogleDrive).mockResolvedValue({ revoked: true } as never);
    expect(await sync(MessageType.CONNECT_GOOGLE_DRIVE)).toEqual({ connected: true, email: 'a***e@example.com' });
    expect(await sync(MessageType.DISCONNECT_GOOGLE_DRIVE)).toEqual({ connected: false, revoked: true });
  });
});

describe('alert handlers', () => {
  it('creates a screen alert with trimmed fields and deduped alert types', async () => {
    const alert = (await alerts(MessageType.CREATE_WATCH_ALERT, {
      name: '  New Villeneuve  ',
      type: 'movie',
      genres: [878],
      keyword: '  dune ',
      alertTypes: ['new-release', 'new-release'],
    })) as Record<string, unknown>;

    expect(alert).toMatchObject({
      name: 'New Villeneuve',
      type: 'movie',
      genres: [878],
      keyword: 'dune',
      alertTypes: ['new-release'],
      enabled: true,
      lastNotifiedMediaIds: [],
    });
    expect(alert.id).toMatch(/^alert_\d+_[a-z0-9]+$/);
    expect(storage.putWatchAlert).toHaveBeenCalledWith(alert);
  });

  it('drops screen-only filters from book alerts', async () => {
    const alert = (await alerts(MessageType.CREATE_WATCH_ALERT, {
      name: 'Le Guin',
      type: 'book',
      genres: [18],
      platforms: ['netflix'],
      authorKeyword: ' Ursula K. Le Guin ',
    })) as Record<string, unknown>;

    expect(alert.genres).toBeUndefined();
    expect(alert.platforms).toBeUndefined();
    expect(alert.authorKeyword).toBe('Ursula K. Le Guin');
  });

  it('rejects an alert without a name', async () => {
    await expect(alerts(MessageType.CREATE_WATCH_ALERT, { name: '   ', type: 'movie' })).rejects.toThrow(/name/i);
    await expect(alerts(MessageType.CREATE_WATCH_ALERT, { type: 'movie' })).rejects.toThrow(/name/i);
    expect(storage.putWatchAlert).not.toHaveBeenCalled();
  });

  it('rejects an invalid update', async () => {
    vi.mocked(storage.isValidWatchAlert).mockReturnValue(false);
    await expect(alerts(MessageType.UPDATE_WATCH_ALERT, { alert: { id: 1 } })).rejects.toThrow('Invalid watch alert payload');
    expect(storage.putWatchAlert).not.toHaveBeenCalled();
  });

  it('deletes by id', async () => {
    expect(await alerts(MessageType.DELETE_WATCH_ALERT, { id: 'alert_1' })).toEqual({ deleted: true });
    expect(storage.deleteWatchAlert).toHaveBeenCalledWith('alert_1');
  });
});
