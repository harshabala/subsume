import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(__dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as {
  permissions: string[];
};

function sourceText(dir: string): string {
  return readdirSync(dir)
    .map((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return sourceText(path);
      return /\.(ts|tsx)$/.test(name) ? readFileSync(path, 'utf8') : '';
    })
    .join('\n');
}

/** Each API permission and the source pattern that proves the extension uses it. */
const USAGE: Record<string, RegExp> = {
  storage: /chrome\.storage\./,
  alarms: /chrome\.alarms\./,
  notifications: /chrome\.notifications\./,
  identity: /chrome\.identity\./,
};

describe('manifest permissions', () => {
  const src = sourceText(join(root, 'src'));

  it('declares only permissions with a known usage pattern', () => {
    for (const permission of manifest.permissions) {
      expect(USAGE, `no usage rule for "${permission}" — is it needed?`).toHaveProperty(permission);
    }
  });

  it('every declared permission is used in src/', () => {
    for (const permission of manifest.permissions) {
      expect(USAGE[permission]?.test(src), `"${permission}" is declared but unused`).toBe(true);
    }
  });

  it('does not request activeTab (no chrome.scripting / action click handler uses it)', () => {
    expect(manifest.permissions).not.toContain('activeTab');
  });
});
