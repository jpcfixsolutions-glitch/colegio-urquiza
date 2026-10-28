ALTER TABLE `auth_sessions` ADD `last_activity_at` integer;--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `logged_out_at` integer;--> statement-breakpoint
CREATE INDEX `auth_sessions_activity_idx` ON `auth_sessions` (`last_activity_at`);