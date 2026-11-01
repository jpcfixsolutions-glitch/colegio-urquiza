PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY,
	`email` text,
	`username` text,
	`password_hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`must_change_password` integer DEFAULT true NOT NULL,
	`last_login_at` integer,
	`password_changed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`(`id`, `email`, `username`, `password_hash`, `active`, `must_change_password`, `last_login_at`, `password_changed_at`, `created_at`, `updated_at`) SELECT `id`, `email`, `username`, `password_hash`, `active`, `must_change_password`, `last_login_at`, `password_changed_at`, `created_at`, `updated_at` FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (lower("username"));--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);