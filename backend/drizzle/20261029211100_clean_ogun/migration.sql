CREATE TABLE `payslip_version_accesses` (
	`payslip_version_id` text NOT NULL,
	`user_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`first_viewed_at` integer,
	`last_viewed_at` integer,
	`view_count` integer DEFAULT 0 NOT NULL,
	`first_download_requested_at` integer,
	`last_download_requested_at` integer,
	`download_request_count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `payslip_version_accesses_pk` PRIMARY KEY(`payslip_version_id`, `user_id`),
	CONSTRAINT `fk_payslip_version_accesses_payslip_version_id_payslip_versions_id_fk` FOREIGN KEY (`payslip_version_id`) REFERENCES `payslip_versions`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslip_version_accesses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslip_version_accesses_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `payslip_view_sessions` (
	`id` text PRIMARY KEY,
	`payslip_id` text NOT NULL,
	`payslip_version_id` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_payslip_view_sessions_payslip_id_payslips_id_fk` FOREIGN KEY (`payslip_id`) REFERENCES `payslips`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslip_view_sessions_payslip_version_id_payslip_versions_id_fk` FOREIGN KEY (`payslip_version_id`) REFERENCES `payslip_versions`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslip_view_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE INDEX `payslip_version_accesses_employee_idx` ON `payslip_version_accesses` (`employee_id`);--> statement-breakpoint
CREATE INDEX `payslip_version_accesses_viewed_idx` ON `payslip_version_accesses` (`first_viewed_at`);--> statement-breakpoint
CREATE INDEX `payslip_view_sessions_lookup_idx` ON `payslip_view_sessions` (`id`,`user_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `payslip_view_sessions_version_idx` ON `payslip_view_sessions` (`payslip_version_id`);