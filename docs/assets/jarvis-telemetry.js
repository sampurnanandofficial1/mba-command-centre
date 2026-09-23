/**
 * J.A.R.V.I.S. Command Centre — telemetry driver
 * Populates .jarvis-telemetry with a live clock, a slowly
 * drifting "coordinate" readout, and a typed system-log line
 * that cycles through short status messages — purely cosmetic,
 * no real data — to sell the "operating interface" feel.
 *
 * Usage: <script type="module" src="./jarvis-telemetry.js"></script>
 * after the .jarvis-telemetry element exists in the DOM.
 */

const LOG_MESSAGES = [
  "SYSTEM NOMINAL // ALL MODULES ONLINE",
  "SYNCING TASK MATRIX...",
  "CALENDAR LINK STABLE",
  "HABIT TRACKER: NO ANOMALIES",
  "RUNNING BACKGROUND DIAGNOSTICS...",
  "MEMORY INDEX OPTIMAL",
  "STANDING BY FOR INPUT",
];

function pad(n) {
  return n.toString().padStart(2, "0");
}

function startClock(el) {
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = `SYS.TIME ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds()
    )}`;
  };
  tick();
  setInterval(tick, 1000);
}

function startCoords(el) {
  if (!el) return;
  let t = 0;
  const tick = () => {
    t += 0.02;
    const lat = (28.6 + Math.sin(t) * 0.004).toFixed(4);
    const lon = (77.2 + Math.cos(t * 0.7) * 0.004).toFixed(4);
    el.textContent = `GEO ${lat}N ${lon}E // LOCKED`;
  };
  tick();
  setInterval(tick, 400);
}

function typeLine(el, text, speed = 28) {
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

async function startLog(el) {
  if (!el) return;
  let idx = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await typeLine(el, LOG_MESSAGES[idx % LOG_MESSAGES.length]);
    idx++;
    await new Promise((r) => setTimeout(r, 2400));
  }
}

function init() {
  const root = document.querySelector(".jarvis-telemetry");
  if (!root) return;
  startClock(root.querySelector('[data-role="clock"]'));
  startCoords(root.querySelector('[data-role="coords"]'));
  startLog(root.querySelector(".jarvis-telemetry-log"));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
