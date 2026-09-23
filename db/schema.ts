import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: text("task_id").notNull(),
  task: text("task").notNull(),
  category: text("category").notNull().default("Other"),
  subcategory: text("subcategory").notNull().default(""),
  parentActivity: text("parent_activity").notNull().default(""),
  context: text("context").notNull().default(""),
  priority: text("priority").notNull().default("P2"),
  status: text("status").notNull().default("Not Started"),
  dateCreated: text("date_created").notNull(),
  startDate: text("start_date").notNull().default(""),
  deadline: text("deadline").notNull().default(""),
  deadlineTime: text("deadline_time").notNull().default(""),
  deadlineTbd: integer("deadline_tbd", { mode: "boolean" }).notNull().default(false),
  fixedEvent: integer("fixed_event", { mode: "boolean" }).notNull().default(false),
  eventDate: text("event_date").notNull().default(""),
  eventTime: text("event_time").notNull().default(""),
  estimatedHours: text("estimated_hours").notNull().default(""),
  actualHours: text("actual_hours").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  waitingFor: text("waiting_for").notNull().default(""),
  followUpDate: text("follow_up_date").notNull().default(""),
  assignedBy: text("assigned_by").notNull().default(""),
  teamMembers: text("team_members").notNull().default(""),
  deliverable: text("deliverable").notNull().default(""),
  stage: text("stage").notNull().default(""),
  venue: text("venue").notNull().default(""),
  link: text("link").notNull().default(""),
  notes: text("notes").notNull().default(""),
  complete: integer("complete", { mode: "boolean" }).notNull().default(false),
  completionDate: text("completion_date").notNull().default(""),
  deadlineReliability: text("deadline_reliability").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_tasks_task_id").on(table.taskId),
  index("idx_tasks_deadline_status").on(table.deadline, table.status),
  index("idx_tasks_category").on(table.category),
]);

export const routineCompletions = sqliteTable("routine_completions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routine: text("routine").notNull(),
  completionDate: text("completion_date").notNull(),
  complete: integer("complete", { mode: "boolean" }).notNull().default(false),
}, (table) => [
  uniqueIndex("idx_routine_date_name").on(table.completionDate, table.routine),
]);

export const listItems = sqliteTable("list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupName: text("group_name").notNull(),
  value: text("value").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
}, (table) => [
  uniqueIndex("idx_list_group_value").on(table.groupName, table.value),
]);
