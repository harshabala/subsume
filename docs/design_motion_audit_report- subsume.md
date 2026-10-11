# Motion & Interaction Design Audit Report: Subsume v0.1.0

**Audit Date:** 2026-06-25  
**Target Application:** Subsume (Chrome MV3 Preact/Vite Extension)  
**Perspective Weighting:** 50% Emil Kowalski (Speed/Restraint) · 40% Jakub Krehel (Production Polish) · 10% Jhey Tompkins (Delight)  

---

## 🧭 Executive Summary & Lenses

Subsume is a high-frequency tool for cinephiles where responsiveness is paramount. Based on our confirmed weighting, motion in Subsume must operate under strict discipline:
* **The Kowalski Lens (50%):** Every animation must justify its existence. UI transitions must stay under 200ms. No keyboard-blocked motion. Snappy, immediate feedback.
* **The Krehel Lens (40%):** Optical perfection. Backdrops must fade in smoothly alongside dialog scale transforms. Dialog exits must ease out gracefully before DOM unmounting.
* **The Tompkins Lens (10%):** Selective magic. Subtle golden shimmers and spring pops reserved strictly for satisfying taste milestones (e.g., logging a watched masterpiece).

---

## 🚨 Prioritized Audit Findings & Remediation

### [CRITICAL-MOT-01] Complete Absence of `prefers-reduced-motion` Media Query Guards
* **Severity:** **CRITICAL** (Mandatory Accessibility Violation)
* **Perspective:** Universal / Emil Kowalski
* **Current State:** In `global.css`, animations like `modal-enter` (`200ms`) execute universally. Users with vestibular disorders who enable OS reduced motion still experience scale transforms and blur filters.
* **Acceptance Criteria:** All CSS transitions and keyframe animations must instantly resolve to near-zero duration when reduced motion is preferred.
* **Remediation Code (`src/ui/styles/global.css`):**
  ```css
  /* ─── Mandatory Accessibility Guard ─────────────────────── */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```

---

### [IMP-MOT-01] Instant Conditional DOM Snap on Modal Dialog Exits
* **Severity:** **IMPORTANT** (Optical Jarring)
* **Perspective:** Jakub Krehel (Production Polish)
* **Current State:** Across `Library.tsx` and `Recommendations.tsx`, dialogs unmount instantly: `{selectedItem && <DetailModal />}`. When a user clicks close, the dialog snaps out in 0ms, truncating visual continuity.
* **Acceptance Criteria:** Dialog exits must execute a 140ms crisp opacity and translate exit curve before DOM unmounting occurs.
* **Remediation Pattern (Preact Hook / CSS Class):**
  ```tsx
  // Inside DetailModal.tsx
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 140); // DOM unmount after exit animation
  };

  return (
    <div className={`modal-content ${isClosing ? 'modal-content--exit' : ''}`}>...</div>
  );
  ```
  ```css
  .modal-content--exit {
    animation: modal-exit 140ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes modal-exit {
    from { opacity: 1; transform: scale(1) translateY(0); }
    to   { opacity: 0; transform: scale(0.96) translateY(4px); }
  }
  ```

---

### [IMP-MOT-02] Abrupt Backdrop Snap on Modal Mount
* **Severity:** **IMPORTANT** (Harsh Entrance)
* **Perspective:** Jakub Krehel (Production Polish)
* **Current State:** `.modal-backdrop` applies `background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(4px)` instantly upon mount, creating a jarring optical flash.
* **Acceptance Criteria:** Backdrop overlays must fade from opacity 0 to 1 over 180ms using an exponential easing curve.
* **Remediation Code (`src/ui/styles/global.css`):**
  ```css
  .modal-backdrop {
    /* Existing styles... */
    animation: backdrop-fade 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  @keyframes backdrop-fade {
    from { opacity: 0; backdrop-filter: blur(0px); }
    to   { opacity: 1; backdrop-filter: blur(4px); }
  }
  ```

---

### [IMP-MOT-03] Sluggish Standard CSS Easings (`ease`, `ease-out`)
* **Severity:** **IMPORTANT** (Lack of Snappiness)
* **Perspective:** Emil Kowalski (Restraint & Speed)
* **Current State:** `--transition-base: 200ms ease;`. Standard browser `ease` has a slow decelerating tail that makes extension dashboards feel sluggish.
* **Acceptance Criteria:** Replace generic keyword easings with custom snappy cubic-bezier curves (`ease-out-quint` or `ease-out-expo`).
* **Remediation Code (`src/ui/styles/global.css`):**
  ```css
  :root {
    /* Kowalski Snappy Curves */
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
    --transition-fast: 120ms var(--ease-out-quint);
    --transition-base: 180ms var(--ease-out-expo);
  }
  ```

---

### [MIN-MOT-01] Abrupt Media Grid Snapping on Filter Swapping
* **Severity:** **MINOR** (Polish Improvement)
* **Perspective:** Jakub Krehel
* **Current State:** Toggling tab buttons (*Movies* vs *TV Shows*) instantaneously replaces DOM nodes without visual morphing.
* **Remediation:** Wrap tab state mutations in `document.startViewTransition(() => setActiveTab(newTab))` where supported by modern Chrome.

---

### [SELECTIVE-DELIGHT-01] Zero Micro-Interaction Celebration on Milestone Logging
* **Severity:** **SELECTIVE DELIGHT (10%)**
* **Perspective:** Jhey Tompkins (Creative Experimentation)
* **Current State:** Marking a film "Watched" or adding a 10/10 rating updates text silently.
* **Remediation:** Add a subtle golden shimmer keyframe animation to the status select chip when transitioning to `'watched'`.
  ```css
  @keyframes gold-celebrate {
    0%   { transform: scale(1); box-shadow: 0 0 0 rgba(201,168,76,0); }
    50%  { transform: scale(1.08); box-shadow: 0 0 16px rgba(201,168,76,0.6); }
    100% { transform: scale(1); box-shadow: 0 0 0 rgba(201,168,76,0); }
  }
  .status--watched-trigger {
    animation: gold-celebrate 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  ```
