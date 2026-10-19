/**
 * Open the Poetic Capture Canvas in the extension UI.
 *
 * Prefer reusing an existing options/UI tab (url contains `ui/index.html`) so
 * Reflect does not pile new tabs. Falls back to chrome.tabs.create when none
 * are open. Deep link shape is always `?act=capture&mediaId=…`.
 *
 * The manifest has no `tabs` permission, so `chrome.tabs.query` returns tabs
 * with `url` undefined — even for this extension's own pages. Own UI tabs are
 * found with `chrome.runtime.getContexts` (Chrome 116+, no permission needed).
 */

/** Pure: build the capture canvas path relative to the extension root. */
export function buildCaptureCanvasPath(mediaId: string): string {
  return `ui/index.html?act=capture&mediaId=${encodeURIComponent(mediaId)}`;
}

/** Pure: full chrome-extension URL for capture (injectable getURL for tests). */
export function buildCaptureCanvasUrl(
  mediaId: string,
  getURL: (path: string) => string = (path) => chrome.runtime.getURL(path)
): string {
  return getURL(buildCaptureCanvasPath(mediaId));
}

/**
 * True when a tab URL is this extension's options/UI shell.
 * When extensionOrigin is provided (production), only match that origin + ui/index.html.
 * Without origin (unit tests): relative paths containing ui/index.html only.
 * Never match other extensions or http(s) URLs.
 */
export function isExtensionUiTabUrl(
  url: string | undefined | null,
  extensionOrigin?: string,
): boolean {
  if (!url) return false;
  if (extensionOrigin) {
    return url.startsWith(extensionOrigin) && url.includes('ui/index.html');
  }
  // Unit tests may pass relative paths (no scheme)
  if (!url.includes('://') && url.includes('ui/index.html')) {
    return true;
  }
  return false;
}

interface UiTabRef {
  id?: number;
  windowId?: number;
}

/** Locate an open extension UI tab via runtime.getContexts; undefined when unavailable. */
async function findUiTabViaContexts(extensionOrigin?: string): Promise<UiTabRef | undefined> {
  if (typeof chrome.runtime.getContexts !== 'function') return undefined;
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['TAB' as chrome.runtime.ContextType],
    });
    const match = contexts.find(
      (c) => c.tabId >= 0 && isExtensionUiTabUrl(c.documentUrl, extensionOrigin),
    );
    return match ? { id: match.tabId, windowId: match.windowId } : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Open capture for mediaId: update an existing extension UI tab if found,
 * otherwise create a new tab. Activates the chosen tab.
 */
export async function openCaptureCanvasTab(mediaId: string): Promise<{ success: true }> {
  const url = buildCaptureCanvasUrl(mediaId);
  // Derive own origin from getURL. Avoid URL.origin — chrome-extension: yields "null" in Node/tests.
  let extensionOrigin: string | undefined;
  try {
    const indexUrl = chrome.runtime.getURL('ui/index.html');
    const match = /^chrome-extension:\/\/[^/]+\//.exec(indexUrl);
    extensionOrigin = match?.[0];
  } catch {
    extensionOrigin = undefined;
  }

  const existing =
    (await findUiTabViaContexts(extensionOrigin)) ??
    (await chrome.tabs.query({})).find(
      (t) => isExtensionUiTabUrl(t.url, extensionOrigin) && typeof t.id === 'number',
    );

  if (existing?.id != null) {
    // Reuse: navigate existing options/UI tab to capture deep link and focus it.
    await chrome.tabs.update(existing.id, { url, active: true });
    if (existing.windowId != null) {
      try {
        await chrome.windows.update(existing.windowId, { focused: true });
      } catch {
        // windows API optional in some contexts
      }
    }
    return { success: true };
  }

  await chrome.tabs.create({ url, active: true });
  return { success: true };
}
