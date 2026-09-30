import fs from "node:fs";
import { quotes } from "../lib/gita-quotes.ts";
import { defaultPlannerSettings, generateDayPlan } from "../lib/time-planner.ts";
import { classifyIntent, findTaskByReference, resolveNavigationTarget } from "../lib/voice-command.ts";

const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const minutes = value => { const [hours, mins] = value.split(":").map(Number); return hours * 60 + mins; };

assert(quotes.length === 365, `Expected 365 daily quotes; found ${quotes.length}.`);
quotes.forEach((quote, index) => {
  assert(quote.length === 3 && quote.every(value => String(value).trim()), `Quote ${index + 1} is incomplete.`);
  assert(/[\u0900-\u097F]/.test(quote[0]), `Quote ${index + 1} has no visible Sanskrit text.`);
});

const firstDate = new Date("2026-09-30T12:00:00Z");
let acknowledgedConstraintExceptions = 0;
for (let offset = 0; offset < 366; offset += 1) {
  const current = new Date(firstDate);
  current.setUTCDate(current.getUTCDate() + offset);
  const date = current.toISOString().slice(0, 10);
  const plan = generateDayPlan(date, defaultPlannerSettings);
  assert(plan.metrics.sleep === 8, `${date}: sleep allocation is ${plan.metrics.sleep}, not 8 hours.`);
  assert(plan.metrics.work === 8, `${date}: work allocation is ${plan.metrics.work}, not 8 hours.`);
  assert(Math.abs(plan.metrics.sleep + plan.metrics.work + plan.metrics.other - 24) < 1e-9, `${date}: 8-8-8 totals do not equal 24 hours.`);
  const items = [...plan.items].sort((a, b) => a.start.localeCompare(b.start));
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    assert(minutes(item.end) > minutes(item.start), `${date}: ${item.title} has a non-positive duration.`);
    if (item.kind === "meal" && minutes(item.end) - minutes(item.start) < 30) {
      assert(Boolean(item.warning), `${date}: short meal ${item.title} is not disclosed as a constraint exception.`);
      acknowledgedConstraintExceptions += 1;
    }
    if (index > 0) {
      const previous = items[index - 1];
      const gap = minutes(item.start) - minutes(previous.end);
      assert(gap >= 0, `${date}: ${previous.title} overlaps ${item.title}.`);
      if (gap < defaultPlannerSettings.gapMinutes) {
        assert(Boolean(previous.warning || item.warning), `${date}: sub-15-minute gap between ${previous.title} and ${item.title} is undisclosed.`);
        acknowledgedConstraintExceptions += 1;
      }
    }
  }
}

assert(classifyIntent("open analytics") === "navigate", "Voice navigation intent failed.");
assert(classifyIntent("mark revise CFA as done") === "complete_task", "Voice completion intent failed.");
assert(classifyIntent("add task revise CFA") === "add_task", "Voice task-add intent failed.");
assert(classifyIntent("never mind") === "cancel", "Voice cancellation intent failed.");
assert(resolveNavigationTarget("show me calendar") === "calendar", "Calendar navigation resolution failed.");
assert(findTaskByReference("mark revise CFA as done", [{ task: "Revise CFA" }])?.task === "Revise CFA", "Voice task matching failed.");

const html = fs.readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");
for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  if (!reference.startsWith("/mba-command-centre/")) continue;
  const path = new URL(`../docs/${reference.replace("/mba-command-centre/", "")}`, import.meta.url);
  assert(fs.existsSync(path), `Generated GitHub Pages asset is missing: ${reference}`);
}

if (failures.length) {
  console.error(failures.map(message => `FAIL: ${message}`).join("\n"));
  process.exit(1);
}

console.log(`Sanity checks passed: 365 quotes, 366 planner days, generated assets, and voice flows. ${acknowledgedConstraintExceptions} timetable constraint exceptions are explicitly disclosed.`);
