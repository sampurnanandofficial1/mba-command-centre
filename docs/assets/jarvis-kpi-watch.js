/**
 * J.A.R.V.I.S. Command Centre — KPI reactive glow watcher
 * Watches .kpi strong, .master-count strong, .progress-kpi strong
 * elements for text content changes and briefly applies a pulse
 * class (defined in jarvis-kpi-pulse.css) when a value updates.
 *
 * Framework-agnostic: uses MutationObserver, so it works whether
 * the numbers are updated by React re-renders, plain DOM writes,
 * or anything else. No dependency on your app's internals.
 *
 * Usage: import this file once at app startup (e.g. in main.tsx
 * or index.html via <script type="module" src="./jarvis-kpi-watch.js">),
 * after the DOM/root has mounted.
 */

const PULSE_MS = 900;
const SELECTOR = ".kpi strong, .master-count strong, .progress-kpi strong";

function flash(el) {
  const card = el.closest(".kpi, .progress-kpi, .master-count");
  el.classList.add("kpi-pulse");
  if (card) card.classList.add("jarvis-flash");

  window.setTimeout(() => {
    el.classList.remove("kpi-pulse");
    if (card) card.classList.remove("jarvis-flash");
  }, PULSE_MS);
}

function watchKpis() {
  const targets = document.querySelectorAll(SELECTOR);
  if (!targets.length) return;

  const lastValues = new WeakMap();

  const observer = new MutationObserver((mutations) => {
    const touched = new Set();
    for (const m of mutations) {
      const el =
        m.target.nodeType === Node.TEXT_NODE
          ? m.target.parentElement
          : m.target;
      if (el && el.matches?.(SELECTOR)) touched.add(el);
    }
    touched.forEach((el) => {
      const current = el.textContent;
      const prev = lastValues.get(el);
      if (prev !== undefined && prev !== current) {
        flash(el);
      }
      lastValues.set(el, current);
    });
  });

  targets.forEach((el) => {
    lastValues.set(el, el.textContent);
    observer.observe(el, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  });

  // Re-scan periodically in case new KPI elements mount later
  // (e.g. navigating between pages in an SPA).
  const rescan = new MutationObserver(() => {
    document.querySelectorAll(SELECTOR).forEach((el) => {
      if (!lastValues.has(el)) {
        lastValues.set(el, el.textContent);
        observer.observe(el, {
          characterData: true,
          childList: true,
          subtree: true,
        });
      }
    });
  });
  rescan.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", watchKpis);
} else {
  watchKpis();
}
