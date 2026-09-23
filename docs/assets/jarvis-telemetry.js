/**
 * J.A.R.V.I.S. Command Centre — telemetry driver (v2)
 * Same clock + coords readout as before, but the scrolling log
 * now reflects REAL numbers already rendered on the page (KPI
 * cards, master task count, overdue count) instead of fake
 * status strings. It reads the DOM directly - no access to your
 * React state/store is needed.
 *
 * It looks for text inside elements matching:
 *   .master-count strong       -> total tasks
 *   .kpi.red strong             -> overdue (best-effort by color class)
 *   .kpi.green strong           -> completed (best-effort)
 *   .overdue-count               -> sidebar badge, fallback source
 * If a selector isn't found, that line is simply skipped -
 * nothing breaks, it just shows fewer lines.
 *
 * Usage: <script type="module" src="./jarvis-telemetry.js">
 * after the .jarvis-telemetry element exists in the DOM.
 */

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

function readNumber(selector) {
  const el = document.querySelector(selector);
  if (!el) return null;
  const match = el.textContent.match(/-?\d+(\.\d+)?/);
  return match ? match[0] : null;
}

function buildStatusLines() {
  const lines = [];

  const total = readNumber(".master-count strong");
  if (total !== null) lines.push(`TASK MATRIX: ${total} TOTAL ENTRIES`);

  const overdue =
    readNumber(".kpi.red strong") ?? readNumber(".overdue-count");
  if (overdue !== null) lines.push(`OVERDUE FLAGS: ${overdue}`);

  const completed = readNumber(".kpi.green strong");
  if (completed !== null) lines.push(`COMPLETED: ${completed} LOGGED`);

  const amber = readNumber(".kpi.amber strong");
  if (amber !== null) lines.push(`PENDING REVIEW: ${amber}`);

  const purple = readNumber(".kpi.purple strong");
  if (purple !== null) lines.push(`IN PROGRESS: ${purple}`);

  if (!lines.length) {
    lines.push("SYSTEM NOMINAL // AWAITING TASK DATA");
  } else {
    lines.push("ALL MODULES SYNCED");
  }

  return lines;
}

function typeLine(el, text, speed = 26) {
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
  while (true) {
    const lines = buildStatusLines();
    await typeLine(el, lines[idx % lines.length]);
    idx++;
    await new Promise((r) => setTimeout(r, 2600));
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
