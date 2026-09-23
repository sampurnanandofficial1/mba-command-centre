/**
 * J.A.R.V.I.S. Command Centre — interaction layer
 * 1. Parallax: the HUD rings/reticle drift slightly toward the
 *    cursor, giving the background a sense of depth/response.
 * 2. Click ripple: any click in the app spawns a brief cyan
 *    ripple at the click point (JARVIS-style confirmation).
 *
 * Usage: <script type="module" src="./jarvis-interact.js">
 * after jarvis-hud-background.css markup exists in the DOM.
 */

function initParallax() {
  const outer = document.querySelector(".jarvis-ring--outer");
  const inner = document.querySelector(".jarvis-ring--inner");
  const reticle = document.querySelector(".jarvis-reticle");
  if (!outer && !inner && !reticle) return;

  let raf = null;
  window.addEventListener("pointermove", (e) => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;

      if (outer) outer.style.transform = `translate(${nx * 10}px, ${ny * 10}px)`;
      if (inner) inner.style.transform = `translate(${nx * -16}px, ${ny * -16}px)`;
      if (reticle) reticle.style.transform = `translate(${nx * 6}px, ${ny * 6}px)`;
      raf = null;
    });
  });
}

function initClickRipple() {
  const style = document.createElement("style");
  style.textContent = `
    .jarvis-ripple {
      position: fixed;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      background: radial-gradient(circle, rgba(84,236,255,0.9) 0%, rgba(84,236,255,0) 70%);
      transform: translate(-50%, -50%) scale(1);
      animation: jarvis-ripple-out 0.6s ease-out forwards;
    }
    @keyframes jarvis-ripple-out {
      to {
        transform: translate(-50%, -50%) scale(9);
        opacity: 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .jarvis-ripple { display: none; }
    }
  `;
  document.head.appendChild(style);

  document.addEventListener("click", (e) => {
    const dot = document.createElement("div");
    dot.className = "jarvis-ripple";
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    document.body.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });
}

function init() {
  initParallax();
  initClickRipple();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
