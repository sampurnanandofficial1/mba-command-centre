"use client";

import * as React from "react";
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, Pencil, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultPlannerSettings, generateDayPlan, PlannerItem, PlannerKind, PlannerSettings, plannerDuration } from "@/lib/time-planner";

const settingsKey = "jarvis_planner_settings_v2";
const legacySettingsKey = "jarvis_planner_settings_v1";
const overridesKey = "jarvis_planner_overrides_v1";
const completionKey = "jarvis_planner_completion_v1";
const kinds: PlannerKind[] = ["class", "study", "focus", "meal", "other"];
const dateAdd = (date: string, count: number) => {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
};
const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date + "T12:00:00Z"));
const emptyItem = (date: string): PlannerItem => ({
  id: `custom-${date}-${Date.now()}`,
  title: "",
  start: "09:00",
  end: "10:00",
  kind: "other",
  note: "",
});
const timeMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};
const minutesTime = (value: number) => `${String(Math.floor(value / 60) % 24).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
const blockOverlaps = (start: number, end: number, item: PlannerItem, gap: number) => start < timeMinutes(item.end) + gap && end > timeMinutes(item.start) - gap;
type PlannerRoutine = { id: number; name: string; time: string };
type TimePlannerProps = {
  today: string;
  embedded?: boolean;
  routines?: PlannerRoutine[];
  routineState?: Record<string, boolean>;
  onRoutine?: (name: string, value: boolean) => void;
  onManageHabits?: () => void;
};

export function TimePlanner({ today, embedded = false, routines = [], routineState = {}, onRoutine, onManageHabits }: TimePlannerProps) {
  const [date, setDate] = React.useState(today);
  const [settings, setSettings] = React.useState<PlannerSettings>(defaultPlannerSettings);
  const [overrides, setOverrides] = React.useState<Record<string, PlannerItem[]>>({});
  const [completion, setCompletion] = React.useState<Record<string, Record<string, boolean>>>({});
  const [editor, setEditor] = React.useState<PlannerItem | null>(null);
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    try {
      const current = localStorage.getItem(settingsKey),
        saved = current ?? localStorage.getItem(legacySettingsKey),
        days = localStorage.getItem(overridesKey),
        checks = localStorage.getItem(completionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!current && parsed.sleepStart === "23:00" && parsed.sleepEnd === "07:00") {
          parsed.sleepStart = "01:00";
          parsed.sleepEnd = "09:00";
          if (parsed.breakfastStart === "08:00") parsed.breakfastStart = "09:15";
        }
        setSettings({ ...defaultPlannerSettings, ...parsed });
      }
      if (days) setOverrides(JSON.parse(days));
      if (checks) setCompletion(JSON.parse(checks));
    } catch {}
    setReady(true);
  }, []);
  React.useEffect(() => {
    if (ready) localStorage.setItem(settingsKey, JSON.stringify(settings));
  }, [ready, settings]);
  React.useEffect(() => {
    if (ready) localStorage.setItem(overridesKey, JSON.stringify(overrides));
  }, [ready, overrides]);
  React.useEffect(() => {
    if (ready) localStorage.setItem(completionKey, JSON.stringify(completion));
  }, [ready, completion]);
  const generated = React.useMemo(() => generateDayPlan(date, settings), [date, settings]);
  const items = React.useMemo(() => {
    const base = [...(overrides[date] ?? generated.items)];
    const mealNames = new Set(["breakfast", "lunch", "snacks", "dinner"]);
    for (const routine of routines) {
      if (mealNames.has(routine.name.toLowerCase()) || base.some((item) => item.id === `routine-${date}-${routine.id}`)) continue;
      let start = Math.max(timeMinutes(routine.time || settings.sleepEnd), timeMinutes(settings.sleepEnd) + settings.gapMinutes);
      while (start < 24 * 60 && base.some((item) => blockOverlaps(start, start + 30, item, settings.gapMinutes))) start += 15;
      base.push({
        id: `routine-${date}-${routine.id}`,
        title: routine.name,
        start: minutesTime(start),
        end: minutesTime(start + 30),
        kind: "other",
        note: "Personal routine · completion contributes to habit analytics",
      });
    }
    return base.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  }, [date, generated.items, overrides, routines, settings]);
  const work = items.filter((x) => ["class", "study", "focus"].includes(x.kind)).reduce((s, x) => s + plannerDuration(x), 0);
  const sleepStart = Number(settings.sleepStart.slice(0, 2)) * 60 + Number(settings.sleepStart.slice(3));
  const sleepEnd = Number(settings.sleepEnd.slice(0, 2)) * 60 + Number(settings.sleepEnd.slice(3));
  const sleep = ((sleepEnd - sleepStart + 24 * 60) % (24 * 60)) / 60,
    other = Math.max(0, 24 - sleep - work);
  const updateSetting = <K extends keyof PlannerSettings>(key: K, value: PlannerSettings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const saveItem = (item: PlannerItem) => {
    if (!item.title.trim() || item.end <= item.start) {
      toast.error("Add a title and make the end time later than the start time.");
      return;
    }
    setOverrides((old) => ({
      ...old,
      [date]: (old[date] ?? generated.items)
        .filter((x) => x.id !== item.id)
        .concat(item)
        .sort((a, b) => a.start.localeCompare(b.start)),
    }));
    setEditor(null);
    toast.success("Planner updated for this day");
  };
  const remove = (id: string) =>
    setOverrides((old) => ({
      ...old,
      [date]: (old[date] ?? generated.items).filter((x) => x.id !== id),
    }));
  const reset = () => {
    setOverrides((old) => {
      const next = { ...old };
      delete next[date];
      return next;
    });
    toast.success("Restored the automatic plan for this day");
  };
  const routineFor = (item: PlannerItem) => routines.find((r) => r.name.toLowerCase() === item.title.toLowerCase());
  const isComplete = (item: PlannerItem) => {
    const routine = routineFor(item);
    return date === today && routine ? Boolean(routineState[routine.name]) : Boolean(completion[date]?.[item.id]);
  };
  const toggleBlock = (item: PlannerItem, value: boolean) => {
    const routine = routineFor(item);
    if (date === today && routine && onRoutine) onRoutine(routine.name, value);
    else
      setCompletion((old) => ({
        ...old,
        [date]: { ...(old[date] ?? {}), [item.id]: value },
      }));
  };
  return (
    <section className={`page-stack planner-page${embedded ? " planner-embedded" : ""}`}>
      <div className="page-intro">
        <div>
          <span className="eyebrow">8–8–8 DAILY OPERATING SYSTEM</span>
          <h2>{embedded ? "Today’s time plan & routines" : "Adaptive time planner"}</h2>
          <p>Classes, focused work, meals and personal routines share one checkable timeline built around a 9:00 AM wake-up.</p>
        </div>
        <div className="planner-heading-actions">
          <Badge variant="outline">TERM V · {generated.dayName}</Badge>
          {onManageHabits ? (
            <Button size="sm" variant="outline" onClick={onManageHabits}>
              <Pencil />
              Edit routines
            </Button>
          ) : null}
        </div>
      </div>
      <div className="planner-toolbar">
        <Button variant="outline" size="icon" onClick={() => setDate(dateAdd(date, -1))}>
          <ChevronLeft />
        </Button>
        <Input aria-label="Planner date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button variant="outline" size="icon" onClick={() => setDate(dateAdd(date, 1))}>
          <ChevronRight />
        </Button>
        <Button variant="outline" onClick={() => setDate(today)}>
          <CalendarClock />
          Today
        </Button>
        <Button variant="outline" onClick={reset}>
          <RotateCcw />
          Reset day
        </Button>
        <Button onClick={() => setEditor(emptyItem(date))}>
          <Plus />
          Add block
        </Button>
      </div>
      <div className="planner-layout">
        <div className="planner-main">
          <div className="planner-balance">
            <BalanceCard label="Sleep" hours={sleep} target={8} tone="sleep" />
            <BalanceCard label="Work & study" hours={work} target={8} tone="work" />
            <BalanceCard label="Other & personal" hours={other} target={8} tone="other" />
          </div>
          <Card className="planner-timeline">
            <CardHeader>
              <div>
                <CardTitle>{formatDate(date)}</CardTitle>
                <span className="micro">{overrides[date] ? "CUSTOM DAY · edits saved in this browser" : "AUTO-GENERATED · edit any block to customize"}</span>
              </div>
              <Badge variant="outline">{items.length} BLOCKS</Badge>
            </CardHeader>
            <CardContent>
              <div className="timeline-list">
                {items.map((item, index) => {
                  const previous = items[index - 1];
                  const gap = previous ? Math.max(0, timeMinutes(item.start) - timeMinutes(previous.end)) : 0;
                  const checked = isComplete(item);
                  return (
                    <React.Fragment key={item.id}>
                      {gap >= 15 ? (
                        <div className="timeline-gap">
                          <span>{gap} min transition / open time</span>
                        </div>
                      ) : null}
                      <div className={`timeline-block ${item.kind}${checked ? " completed" : ""}`}>
                        <Checkbox className="timeline-check" checked={checked} onCheckedChange={(value) => toggleBlock(item, Boolean(value))} aria-label={`Mark ${item.title} complete`} />
                        <div className="timeline-time">
                          <strong>{item.start}</strong>
                          <span>{item.end}</span>
                        </div>
                        <i />
                        <div className="timeline-copy">
                          <div>
                            <Badge variant="outline">{routineFor(item) ? "ROUTINE" : item.kind.toUpperCase()}</Badge>
                            {item.locked ? <span className="locked-label">SOURCE SCHEDULE</span> : null}
                          </div>
                          <h3>{item.title}</h3>
                          {item.note ? <p>{item.note}</p> : null}
                          {item.warning ? (
                            <p className="timeline-warning">
                              <AlertTriangle />
                              {item.warning}
                            </p>
                          ) : null}
                        </div>
                        <div className="timeline-actions">
                          <span>{plannerDuration(item).toFixed(2).replace(/\.00$/, "")}h</span>
                          <Button size="icon" variant="ghost" aria-label={`Edit ${item.title}`} onClick={() => setEditor(item)}>
                            <Pencil />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label={`Delete ${item.title}`} onClick={() => remove(item.id)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {generated.warnings.length ? (
            <Card className="planner-warnings">
              <CardHeader>
                <AlertTriangle />
                <CardTitle>Schedule constraints requiring attention</CardTitle>
              </CardHeader>
              <CardContent>
                {generated.warnings.map((w) => (
                  <p key={w}>{w}</p>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
        <PlannerSettingsPanel settings={settings} update={updateSetting} weeklyClasses={generated.metrics.weeklyClasses} weeklyStudyDemand={generated.metrics.weeklyStudyDemand} />
      </div>
      <ActivityEditor value={editor} onClose={() => setEditor(null)} onSave={saveItem} />
    </section>
  );
}

function usePlannerSnapshot() {
  const [settings, setSettings] = React.useState<PlannerSettings>(defaultPlannerSettings);
  const [overrides, setOverrides] = React.useState<Record<string, PlannerItem[]>>({});
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(settingsKey),
        days = localStorage.getItem(overridesKey);
      if (saved) setSettings({ ...defaultPlannerSettings, ...JSON.parse(saved) });
      if (days) setOverrides(JSON.parse(days));
    } catch {}
  }, []);
  return { settings, overrides };
}

export function PlannerWeekOverview({ today }: { today: string }) {
  const { settings, overrides } = usePlannerSnapshot();
  const days = Array.from({ length: 7 }, (_, i) => dateAdd(today, i));
  return (
    <Card className="planner-overview">
      <CardHeader>
        <div>
          <span className="eyebrow">INTEGRATED 8–8–8 TIMETABLE</span>
          <CardTitle>Seven-day execution plan</CardTitle>
          <span className="micro">Classes, meals, focus phases and study blocks · edit rules or blocks from Today</span>
        </div>
        <Badge variant="outline">7 DAYS</Badge>
      </CardHeader>
      <CardContent>
        <div className="planner-week-grid">
          {days.map((date) => {
            const generated = generateDayPlan(date, settings);
            const items = overrides[date] ?? generated.items;
            return (
              <article className={date === today ? "planner-week-day today" : "planner-week-day"} key={date}>
                <header>
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "short",
                    }).format(new Date(date + "T12:00:00Z"))}
                  </span>
                  <strong>{new Date(date + "T12:00:00Z").getUTCDate()}</strong>
                </header>
                <div>
                  {items.map((item) => (
                    <div className={`planner-mini ${item.kind}`} key={item.id}>
                      <time>{item.start}</time>
                      <i />
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
                <footer>
                  <span>{generated.metrics.work.toFixed(1)}h work</span>
                  <span>{generated.metrics.other.toFixed(1)}h other</span>
                </footer>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function PlannerMonthOverview({ today }: { today: string }) {
  const { settings, overrides } = usePlannerSnapshot();
  const days = Array.from({ length: 30 }, (_, i) => dateAdd(today, i));
  return (
    <Card className="planner-overview planner-month">
      <CardHeader>
        <div>
          <span className="eyebrow">30-DAY PLANNER MAP</span>
          <CardTitle>Academic and focus timetable</CardTitle>
          <span className="micro">Key timetable blocks appear here; full daily detail remains on Today.</span>
        </div>
        <Badge variant="outline">30 DAYS</Badge>
      </CardHeader>
      <CardContent>
        <div className="planner-month-grid">
          {days.map((date) => {
            const generated = generateDayPlan(date, settings);
            const all = overrides[date] ?? generated.items;
            const keyItems = all.filter((item) => item.kind === "class" || item.kind === "focus");
            return (
              <article className={date === today ? "planner-month-day today" : "planner-month-day"} key={date}>
                <header>
                  <span>
                    {new Intl.DateTimeFormat("en-IN", {
                      weekday: "short",
                    }).format(new Date(date + "T12:00:00Z"))}
                  </span>
                  <strong>{new Date(date + "T12:00:00Z").getUTCDate()}</strong>
                </header>
                <div>
                  {keyItems.slice(0, 5).map((item) => (
                    <div className={`planner-mini ${item.kind}`} key={item.id}>
                      <time>{item.start}</time>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
                <footer>{all.length} total blocks</footer>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BalanceCard({ label, hours, target, tone }: { label: string; hours: number; target: number; tone: string }) {
  const percentage = Math.min(100, (hours / target) * 100);
  const variance = hours - target;
  return (
    <Card className={`balance-card ${tone}`}>
      <span>{label}</span>
      <strong>
        {hours.toFixed(1)}
        <small> / {target}h</small>
      </strong>
      <div>
        <i style={{ width: `${percentage}%` }} />
      </div>
      <small>{Math.abs(variance) < 0.05 ? "On target" : variance > 0 ? `${variance.toFixed(1)}h over target` : `${Math.abs(variance).toFixed(1)}h available`}</small>
    </Card>
  );
}

function PlannerSettingsPanel({ settings, update, weeklyClasses, weeklyStudyDemand }: { settings: PlannerSettings; update: <K extends keyof PlannerSettings>(key: K, value: PlannerSettings[K]) => void; weeklyClasses: number; weeklyStudyDemand: number }) {
  const number = (key: keyof PlannerSettings, label: string, min: number, max: number, step = 0.5) => (
    <div className="planner-setting">
      <Label>{label}</Label>
      <Input type="number" min={min} max={max} step={step} value={String(settings[key])} onChange={(e) => update(key, Number(e.target.value) as never)} />
    </div>
  );
  const time = (key: keyof PlannerSettings, label: string) => (
    <div className="planner-setting">
      <Label>{label}</Label>
      <Input type="time" value={String(settings[key])} onChange={(e) => update(key, e.target.value as never)} />
    </div>
  );
  const date = (key: keyof PlannerSettings, label: string) => (
    <div className="planner-setting">
      <Label>{label}</Label>
      <Input type="date" value={String(settings[key])} onChange={(e) => update(key, e.target.value as never)} />
    </div>
  );
  return (
    <Card className="planner-settings">
      <CardHeader>
        <div>
          <CardTitle>Planner rules</CardTitle>
          <span className="micro">Changes regenerate all non-custom days</span>
        </div>
        <Save />
      </CardHeader>
      <CardContent>
        <div className="settings-section">
          <h3>Academic load</h3>
          {number("studyHoursPerClass", "Self-study per class", 1, 6, 0.5)}
          {date("algoStartDate", "Algo Investing begins")}
        </div>
        <div className="settings-section">
          <h3>Focus phase</h3>
          {date("phaseSwitchDate", "CFA phase begins")}
          {number("caseHours", "Case competition hours", 0, 8, 0.5)}
          {number("cfaHours", "CFA Level II hours", 0, 8, 0.5)}
        </div>
        <div className="settings-section">
          <h3>Sleep & transitions</h3>
          {time("sleepStart", "Sleep begins")}
          {time("sleepEnd", "Wake-up time")}
          {number("gapMinutes", "Target gap (minutes)", 0, 60, 5)}
        </div>
        <div className="settings-section">
          <h3>Meals</h3>
          {number("mealMinutes", "Preferred duration (minutes)", 30, 180, 15)}
          {time("breakfastStart", "Breakfast preferred start")}
          {time("lunchStart", "Lunch preferred start")}
          {time("snackStart", "Snacks preferred start")}
          {time("dinnerStart", "Dinner preferred start")}
          <p className="planner-rule-note">Start within the mess window; finish whenever needed.</p>
        </div>
        <div className="study-demand">
          <span>Weekly class sessions</span>
          <strong>{weeklyClasses}</strong>
          <span>Weekly self-study demand</span>
          <strong>{weeklyStudyDemand}h</strong>
          <p>The daily plan caps work at eight hours. Excess academic demand remains a visible backlog rather than violating 8–8–8.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityEditor({ value, onClose, onSave }: { value: PlannerItem | null; onClose: () => void; onSave: (item: PlannerItem) => void }) {
  const [draft, setDraft] = React.useState<PlannerItem | null>(null);
  React.useEffect(() => setDraft(value), [value]);
  if (!draft) return null;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="planner-editor">
        <DialogHeader>
          <DialogTitle>Edit time block</DialogTitle>
          <DialogDescription>Customize this date without changing the source timetable or any other day.</DialogDescription>
        </DialogHeader>
        <div className="form-grid">
          <div className="field span-2">
            <Label>Activity</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="field">
            <Label>Start</Label>
            <Input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
          </div>
          <div className="field">
            <Label>End</Label>
            <Input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          </div>
          <div className="field span-2">
            <Label>Bucket</Label>
            <Select value={draft.kind} onValueChange={(kind) => setDraft({ ...draft, kind: kind as PlannerKind })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kinds.map((k) => (
                  <SelectItem value={k} key={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="field span-2">
            <Label>Note</Label>
            <Input value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave({ ...draft, locked: false })}>
            <Save />
            Save block
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
