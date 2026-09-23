/**
 * J.A.R.V.I.S. Command Centre — boot sequence driver
 * Plays a short typed boot log + progress bar once per browser
 * session (sessionStorage-gated so it doesn't replay on every
 * SPA navigation), then fades the overlay out.
 *
 * Usage: <script type="module" src="./jarvis-boot.js"></script>
 * placed after the .jarvis-boot markup exists in the DOM.
 */

const BOOT_LINES = [
  "INITIALIZING CORE SYSTEMS...",
  "LOADING TASK MATRIX...",
  "CALIBRATING HABIT ENGINE...",
  "ESTABLISHING CALENDAR LINK...",
  "ALL SYSTEMS NOMINAL",
];

const SESSION_KEY = "jarvis-booted";

function typeLine(el, text, speed = 22) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const span = document.createElement("span");
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    el.appendChild(span);
    el.appendChild(cursor);

    const step = () => {
      if (i <= text.length) {
        span.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      } else {
        resolve();
      }
    };
    step();
  });
}

async function runBoot() {
  const overlay = document.getElementById("jarvis-boot");
  if (!overlay) return;

  // Skip replaying the full boot on every SPA route change within
  // the same tab session — only show it once per browser session.
  if (sessionStorage.getItem(SESSION_KEY)) {
    overlay.classList.add("jarvis-boot--hidden");
    setTimeout(() => overlay.remove(), 800);
    return;
  }

  const log = document.getElementById("jarvis-boot-log");
  const bar = overlay.querySelector(".jarvis-boot-bar-fill");

  const stepPercent = 100 / BOOT_LINES.length;
  let progress = 0;

  for (const line of BOOT_LINES) {
    await typeLine(log, line);
    progress += stepPercent;
    if (bar) bar.style.width = `${Math.min(progress, 100)}%`;
    await new Promise((r) => setTimeout(r, 220));
  }

  await new Promise((r) => setTimeout(r, 350));

  overlay.classList.add("jarvis-boot--hidden");
  sessionStorage.setItem(SESSION_KEY, "1");
  setTimeout(() => overlay.remove(), 800);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", runBoot);
} else {
  runBoot();
}
