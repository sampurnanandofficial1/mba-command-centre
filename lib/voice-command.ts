// Voice command intent classification.
//
// Modeled on thevickypedia/Jarvis's keyword-mapping dispatch
// (jarvis/modules/conditions/keywords.py + conversation.py): an ordered list of
// {intent, phrases} pairs is matched against the transcript, and the first intent
// whose phrase is found wins. Jarvis explicitly preserves list order because "the
// condition loop executes sequentially" - we keep that same contract here, just
// pointed at this app's task-management intents instead of Jarvis's OS/automation ones.
export type VoiceIntent = "cancel" | "complete_task" | "navigate" | "add_task";

const keywordMapping: { intent: VoiceIntent; phrases: string[] }[] = [
  { intent: "cancel", phrases: ["never mind", "cancel that", "close this", "forget it"] },
  { intent: "complete_task", phrases: ["mark ", "complete ", "finish ", "marked as done", "done with"] },
  { intent: "navigate", phrases: ["open ", "show me", "switch to", "go to", "take me to", "navigate to"] },
  // "add_task" is the fallback when nothing above matches, preserving this
  // assistant's original single-purpose behaviour (dictate a task to create it).
];

export function classifyIntent(command: string): VoiceIntent {
  const lower = command.toLowerCase();
  for (const { intent, phrases } of keywordMapping) {
    if (phrases.some(p => lower.includes(p))) return intent;
  }
  return "add_task";
}

const navigationSynonyms: Record<string, string[]> = {
  today: ["today", "home", "dashboard"],
  master: ["master task", "master list", "all tasks", "task list"],
  weekly: ["weekly", "this week", "week view"],
  calendar: ["calendar"],
  analytics: ["analytics", "stats", "statistics", "insights"],
  archive: ["archive", "completed tasks", "done tasks"],
  settings: ["settings", "preferences"],
  quotes: ["quote", "gita", "dharma"],
  "Case Competition": ["case competition", "case comp"],
  Classes: ["classes", "class"],
  Exams: ["exams", "exam"],
  Research: ["research"],
  Placements: ["placements", "placement"],
  Other: ["other"],
};

export function resolveNavigationTarget(command: string): string | null {
  const lower = command.toLowerCase();
  for (const [view, phrases] of Object.entries(navigationSynonyms)) {
    if (phrases.some(p => lower.includes(p))) return view;
  }
  return null;
}

export function findTaskByReference<T extends { task: string }>(command: string, tasks: T[]): T | null {
  const lower = command.toLowerCase();
  const remainder = lower
    .replace(/^.*?(mark|complete|finish)\s+/, "")
    .replace(/\s+(as\s+)?(done|complete|completed|finished)\b.*$/, "")
    .trim();
  if (!remainder) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const t of tasks) {
    const title = t.task.toLowerCase();
    if (title === remainder) return t;
    if (title.includes(remainder) || remainder.includes(title)) {
      const score = Math.min(title.length, remainder.length);
      if (score > bestScore) { bestScore = score; best = t; }
    }
  }
  return best;
}
