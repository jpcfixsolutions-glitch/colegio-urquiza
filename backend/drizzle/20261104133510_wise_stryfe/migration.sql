CREATE TABLE `password_recovery_requests` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`request_count` integer DEFAULT 1 NOT NULL,
	`first_requested_at` integer NOT NULL,
	`last_requested_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by_user_id` text,
	`cancelled_at` integer,
	`cancelled_by_user_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_password_recovery_requests_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_password_recovery_requests_resolved_by_user_id_users_id_fk` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_password_recovery_requests_cancelled_by_user_id_users_id_fk` FOREIGN KEY (`cancelled_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT "password_recovery_requests_status_check" CHECK("status" IN ('PENDING', 'RESOLVED', 'CANCELLED')),
	CONSTRAINT "password_recovery_requests_count_check" CHECK("request_count" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `password_recovery_requests_one_pending_unique` ON `password_recovery_requests` (`user_id`) WHERE "password_recovery_requests"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX `password_recovery_requests_status_last_requested_idx` ON `password_recovery_requests` (`status`,`last_requested_at`);--> statement-breakpoint
CREATE INDEX `password_recovery_requests_user_idx` ON `password_recovery_requests` (`user_id`);