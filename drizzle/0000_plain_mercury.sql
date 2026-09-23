CREATE TABLE `list_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_name` text NOT NULL,
	`value` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_list_group_value` ON `list_items` (`group_name`,`value`);--> statement-breakpoint
CREATE TABLE `routine_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine` text NOT NULL,
	`completion_date` text NOT NULL,
	`complete` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_routine_date_name` ON `routine_completions` (`completion_date`,`routine`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`task_id` text NOT NULL,
	`task` text NOT NULL,
	`category` text DEFAULT 'Other' NOT NULL,
	`subcategory` text DEFAULT '' NOT NULL,
	`parent_activity` text DEFAULT '' NOT NULL,
	`context` text DEFAULT '' NOT NULL,
	`priority` text DEFAULT 'P2' NOT NULL,
	`status` text DEFAULT 'Not Started' NOT NULL,
	`date_created` text NOT NULL,
	`start_date` text DEFAULT '' NOT NULL,
	`deadline` text DEFAULT '' NOT NULL,
	`deadline_time` text DEFAULT '' NOT NULL,
	`deadline_tbd` integer DEFAULT false NOT NULL,
	`fixed_event` integer DEFAULT false NOT NULL,
	`event_date` text DEFAULT '' NOT NULL,
	`event_time` text DEFAULT '' NOT NULL,
	`estimated_hours` text DEFAULT '' NOT NULL,
	`actual_hours` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`waiting_for` text DEFAULT '' NOT NULL,
	`follow_up_date` text DEFAULT '' NOT NULL,
	`assigned_by` text DEFAULT '' NOT NULL,
	`team_members` text DEFAULT '' NOT NULL,
	`deliverable` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT '' NOT NULL,
	`venue` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`complete` integer DEFAULT false NOT NULL,
	`completion_date` text DEFAULT '' NOT NULL,
	`deadline_reliability` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_task_id` ON `tasks` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_tasks_deadline_status` ON `tasks` (`deadline`,`status`);--> statement-breakpoint
CREATE INDEX `idx_tasks_category` ON `tasks` (`category`);