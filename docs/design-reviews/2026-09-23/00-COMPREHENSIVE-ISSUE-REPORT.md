# Subsume Comprehensive Review & Issue Report

**Date:** 2026-09-23  
**Target Branch:** `feat/path-to-10` (Pull Request #9)  
**Evaluated Repository:** `<local-path>`  
**Review Method:** 3 Specialized Multi-Domain Subagents running parallel deep inspection  
**Disciplines Audited:** Brand & Content, Design/UX/Accessibility, Code/Architecture/Security  

---

## 1. Executive Summary & Scorecard

Following the completion of the *Path to 10/10* implementation, a comprehensive, multi-disciplinary review was conducted across three specialist domains. Subsume exhibits exceptional foundational engineering—zero TypeScript errors, 617 passing tests, WebCrypto AES-GCM at-rest encryption, an origin-restricted background message router, and an evocative, dignified design system.

However, the audit identified critical cross-cutting friction points: **cinema terminology polluting literature workflows**, **WCAG contrast and focus isolation failures**, **Manifest V3 cold-start race conditions**, and **unencrypted OAuth tokens / browsing URL leaks in diagnostics**.

### Domain Scorecard

| Discipline | Score | Status | Lead Auditor Focus |
|:---|:---:|:---:|:---|
| **Brand & Content** | **8.2 / 10** | Strong with Gaps | Copywriting, medium consistency, anti-AI tone, first 60s clarity |
| **Design, UX & Accessibility** | **7.1 / 10** | Requires Action | Ferrari tokens, motion settling, WCAG 2.2 AA, touch targets |
| **Code, Architecture & Security** | **7.8 / 10** | Hardening Needed | MV3 lifecycle, secret storage, memory leaks, IndexedDB atomicity |
| **Composite Score** | **7.7 / 10** | **Grade: B+** | **Path to 9.5+ charted below** |

---

## 2. Master Prioritized Issue Matrix

### Critical (P0): Blockers, Vulnerabilities, Severe Confusion

| ID | Domain | Summary | File & Location | Impact |
|:---|:---|:---|:---|:---|
| **P0-BC1** | Brand | Book erasure: Film jargon forced on books ("Credits", "Directed by [Author]", "Screening") | [`src/ui/components/DetailModal.tsx:1147`](<local-path>), [`src/ui/components/PoeticCaptureCanvas.tsx:325`](<local-path>) | Brand incoherence; breaks dual-medium identity |
| **P0-BC2** | Brand | Confusing "Projected" stat label for completed saves in popup overview | [`src/ui/popup.tsx:408`](<local-path>) | User disorientation during quick status checks |
| **P0-BC3** | Brand | "Google Drive Sync" claim contradicts snapshot backup architecture | [`README.md:91`](<local-path>) | Misleading product promise; expectation of live sync |
| **P0-DX1** | Design | HoverCard primary button text contrast inversion (1.91:1) fails WCAG | [`src/content/hoverCard.tsx:1022`](<local-path>) | Primary CTA illegible on host websites |
| **P0-DX2** | Design | Unlabeled textareas and inputs in ReflectionTimeline | [`src/ui/components/ReflectionTimeline.tsx:192-241`](<local-path>) | WCAG 4.1.2 failure; screen readers announce generic inputs |
| **P0-DX3** | Design | Incomplete background `inert` scoping exposes sibling DOM to screen readers | [`src/ui/components/DetailModal.tsx:539`](<local-path>), [`src/ui/App.tsx:580`](<local-path>) | Focus escapes modal in virtual cursor mode |
| **P0-CS1** | Code | MV3 Service worker cold-start race condition on in-memory API keys | [`src/background/index.ts:40-51`](<local-path>), [`src/background/tmdb.ts:56`](<local-path>) | Fatal missing-key exception thrown on resurrected worker |
| **P0-CS2** | Code | Google Drive OAuth access token stored unencrypted in `chrome.storage.local` | [`src/background/drive-sync.ts:96-103`](<local-path>) | Plaintext cloud token exposure at rest |
| **P0-CS3** | Code | Full browsing URLs (with queries) and user email persisted in diagnostic logs | [`src/shared/messages.ts:91`](<local-path>), [`src/background/drive-sync.ts:239`](<local-path>) | Privacy violation; sensitive browser history logged |

---

### Important (P1): Violations of Guidelines, Memory Leaks, Inconsistencies

| ID | Domain | Summary | File & Location |
|:---|:---|:---|:---|
| **P1-BC1** | Brand | Banned word "dispatch" active in Settings toggles and README | [`src/ui/pages/Settings.tsx:650`](<local-path>), [`README.md:84`](<local-path>) |
| **P1-BC2** | Brand | Container identity synonym cycling (Vault vs. Archive vs. Picture Palace vs. Ledger) | [`src/ui/pages/Home.tsx:453-471`](<local-path>), [`src/shared/productCopy.ts:29`](<local-path>) |
| **P1-BC3** | Brand | Ceremony dissonance: "Inscribe afterglow" vs. "Save reflection" | [`src/ui/pages/Home.tsx:390`](<local-path>), [`src/ui/pages/Settings.tsx:1263`](<local-path>) |
| **P1-DX1** | Design | Spring drawer oscillation settles at 617ms, exceeding 300ms ceiling | [`src/ui/hooks/useSpringDrawer.ts:14-17`](<local-path>) |
| **P1-DX2** | Design | HoverCard PRM freeze: disabling CSS transition forces 300ms fallback lag | [`src/content/hoverCard.tsx:565-585`](<local-path>) |
| **P1-DX3** | Design | DetailModal close/flush drops uncommitted rating slider draft | [`src/ui/components/DetailModal.tsx:352-376`](<local-path>) |
| **P1-DX4** | Design | Interactive touch targets below 44px floor (32px–40px in sanctuary/poetic CSS) | [`src/ui/styles/poetic-sanctuary.css:266`](<local-path>), [`sanctuary.css:3138`](<local-path>) |
| **P1-DX5** | Design | PoeticCaptureCanvas Roman numeral rating buttons missing accessible names | [`src/ui/components/PoeticCaptureCanvas.tsx:393`](<local-path>) |
| **P1-DX6** | Design | Focus visible outline stripped on First-Inscription gate buttons | [`src/ui/styles/first-inscription-gate.css:49`](<local-path>) |
| **P1-DX7** | Design | Undefined `--danger` token reference in settings diagnostics falls back to red | [`src/ui/styles/settings-nav.css:355`](<local-path>) |
| **P1-DX8** | Design | IntentNavigation uses `role="tab"` without roving tabindex or arrow keys | [`src/ui/components/archive/IntentNavigation.tsx:74`](<local-path>) |
| **P1-CS1** | Code | Content script memory leak: uncleaned host DOM listeners & wrapper spans | [`src/content/hoverCard.tsx:378`](<local-path>), [`src/content/overlay.ts:40`](<local-path>) |
| **P1-CS2** | Code | Non-atomic IndexedDB dual writes across `media` and `works` stores | [`src/background/storage.ts:657`](<local-path>) |
| **P1-CS3** | Code | Diagnostic log concurrent write loss via unsequenced promise chains | [`src/shared/diagnosticLog.ts:48`](<local-path>) |
| **P1-CS4** | Code | Ineffective dynamic imports generate warnings and split background chunks | [`src/background/handlers/relations.ts:259`](<local-path>), [`vite.config.ts:81`](<local-path>) |

---

### Minor (P2): Polish, Grid Alignment, Code Cleanliness

- **P2-BC1:** Raw em-dashes violating `docs/CINEMA_VOICE.md` rule in [`src/shared/productCopy.ts:11, 43, 70, 205`](<local-path>).
- **P2-BC2:** Pretentious loading/error text in [`src/ui/components/PoeticCaptureCanvas.tsx:307`](<local-path>) ("Opening the frame…").
- **P2-BC3:** Roman numeral glyph clutter in compact quick capture.
- **P2-DX1:** Spacing scale deviations off 4px grid (5px, 6px, 10px, 14px in discovery and recommendations).
- **P2-DX2:** Residual sepia palette fallbacks in [`src/ui/styles/recommendations.css:78-113`](<local-path>).
- **P2-DX3:** Raw un-tokenized `#c45c5c` error color in [`src/ui/styles/onboarding.css:329`](<local-path>).
- **P2-DX4:** Inline raw `rgba()` in [`src/ui/pages/Search.tsx:152`](<local-path>).
- **P2-DX5:** Silent swallow on preferred edition and re-experience errors in [`DetailModal.tsx:285`](<local-path>).
- **P2-CS1:** Unbounded in-memory cache maps in `tmdb.ts`, `omdb.ts`, and `googleBooks.ts`.
- **P2-CS2:** Non-persistent chrome storage mock in `tests/setup.ts` risking test state leakage.
- **P2-CS3:** 107 ESLint warnings and loose `any` types across UI pages.

---

## 3. Deep Dive: Brand & Content Findings

### Medium Parity (Screen vs. Literature)
Subsume positioned books as a premier first-class medium. However, shared components still project film-only metaphors onto literature:
- In [`DetailModal.tsx`](<local-path>), book notes ask: *"What stayed with you after the credits?"*  
  $\rightarrow$ **Fix:** `isBook ? "What stayed with you after the final page?" : "What stayed with you after the credits?"`
- In [`PoeticCaptureCanvas.tsx`](<local-path>), authors are rendered as `Directed by {author}`.  
  $\rightarrow$ **Fix:** `media?.type === 'book' ? `By ${director}` : `Directed by ${director}``
- In [`popup.tsx`](<local-path>), the completed count is labeled `"Projected"`.  
  $\rightarrow$ **Fix:** Label as `"Watched & Read"` or `"Completed"`.

### Conceptual Container Consistency
The app introduces six names for its primary collection: *Vault*, *Archive*, *Sanctuary*, *Picture Palace*, *Ledger*, and *Repertoire*.
- Standardize the product category: **"Private movie & book journal"**.
- Standardize the collection view: **"Archive"** (remove "Vault" from buttons and "Ledger" from onboarding).
- Standardize primary capture action: **"Save reflection"** / **"Add to archive"** (deprecate "Inscribe").

---

## 4. Deep Dive: Design, UX & Accessibility Findings

### Contrast & Visual Accessibility
- **HoverCard Primary Button ([`hoverCard.tsx:1022`](<local-path>)):** `.subsume-btn-primary` applies text color `var(--background)` (`#181818`) over a `#da291c` $\rightarrow$ `#9d2211` gradient. The contrast against the darker stop is **1.91:1** (failing the 4.5:1 WCAG AA threshold).  
  $\rightarrow$ **Fix:** Set `color: var(--on-primary-fg, #ffffff);`.
- **Reflection Inputs ([`ReflectionTimeline.tsx:192-241`](<local-path>)):** The three textareas/inputs lack explicit `aria-label` or `<label>` associations.

### Motion Dynamics
- **Spring Drawer Settling Time ([`useSpringDrawer.ts:14-17`](<local-path>)):** The current spring parameters (`STIFFNESS = 280; DAMPING = 2 * Math.sqrt(STIFFNESS)`) take **617ms** to settle below `SETTLE_POS = 0.002`. Because menu focus restoration awaits `onSettledClosed`, keyboard navigation lags.  
  $\rightarrow$ **Fix:** Increase `STIFFNESS` to `550`, set `SETTLE_POS = 0.005`, and enforce a hard cutoff at `280ms`.
- **Reduced Motion Freeze ([`hoverCard.tsx:565`](<local-path>)):** Disabling CSS transitions under `prefers-reduced-motion` prevents `transitionend` from firing, triggering a 300ms timeout penalty before unmounting.

---

## 5. Deep Dive: Code, Architecture & Security Findings

### Service Worker Concurrency & Cold Start
- **In-Memory Key Desynchronization ([`index.ts:40`](<local-path>)):** MV3 service workers wake on demand. In `index.ts`, `getPreferences()` runs unawaited. Incoming message handlers accessing `tmdbApiKey` fail before preference hydration finishes.  
  $\rightarrow$ **Fix:** Expose `ensureTmdbApiKey(): Promise<string>` that awaits preference initialization on cache miss.

### Secret Storage & Data Scrubbing
- **OAuth Token Encryption ([`drive-sync.ts:96`](<local-path>)):** Google Drive OAuth access tokens grant cloud read/write permissions and are stored in plaintext in `chrome.storage.local`. They must be encrypted via `encryptKey()` identically to TMDb/LLM keys.
- **Diagnostic URL Scrubbing ([`messages.ts:91`](<local-path>)):** `sender.url` is recorded in persistent logs on rejected messages. Full query strings and paths leak browsing habits. Only the sanitized `new URL(sender.url).origin` should be logged.

### Content Script Lifecycle
- Host DOM event listeners registered in `HoverCardManager.attachToElement` retain closures and DOM elements. Teardown requires `AbortController` cancellation.
- Injected `<span class="subsume-poster-wrap">` elements must be unwrapped upon script teardown.

---

## 6. Phased Remediation Plan

```mermaid
flowchart TD
  subgraph Phase 1: Security & Accessibility P0s
    A1["Encrypt Drive OAuth Token at rest"]
    A2["Sanitize diagnostic URLs and emails"]
    A3["Fix HoverCard button contrast (1.91:1 -> 4.5:1+)"]
    A4["Add aria-labels to Reflection inputs"]
    A5["Lazy-await API keys on SW cold-start"]
  end

  subgraph Phase 2: Dual-Medium Copy & Motion
    B1["Condition DetailModal/Capture labels for books"]
    B2["Rename Projected -> Watched & Read in popup"]
    B3["Tighten spring drawer to <= 280ms"]
    B4["Purge 'dispatch' from Settings and README"]
    B5["Normalize touch targets to >= 44px floor"]
  end

  subgraph Phase 3: Content Script Lifecycle & Rollup Chunks
    C1["AbortController for HoverCard DOM listeners"]
    C2["Atomic multi-store IndexedDB dual-writes"]
    C3["Top-level imports to remove Vite dynamic chunk warnings"]
    C4["Standardize 4px grid spacing & Ferrari tokens"]
  end

  Phase 1 --> Phase 2 --> Phase 3
```

1. **Immediate P0 Patch Wave:** Address data privacy (OAuth token encryption, URL scrub), service worker reliability (lazy API key hydration), and WCAG AA blockers (button contrast, accessible form controls).
2. **Medium Parity & Motion Wave:** Remove cinema jargon from book paths, normalize container terminology ("Archive"), tighten spring physics to $\le$ 280ms, and scale touch targets to 44px.
3. **Architecture & Bundler Wave:** Eliminate content script DOM leaks, enforce atomic IndexedDB writes, and clean up Rollup dynamic import chunks.
