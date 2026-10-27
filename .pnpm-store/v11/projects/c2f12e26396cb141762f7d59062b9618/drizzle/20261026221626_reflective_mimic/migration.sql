ALTER TABLE `employees` ADD `cuit` text;--> statement-breakpoint
ALTER TABLE `payslips` ADD `notify_user` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `payslips` ADD `notification_read_at` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payslips` (
	`id` text PRIMARY KEY,
	`employee_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`document_type` text DEFAULT 'SALARY' NOT NULL,
	`title` text,
	`notify_user` integer DEFAULT false NOT NULL,
	`notification_read_at` integer,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`created_by` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_payslips_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslips_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT "payslips_month_check" CHECK("month" >= 1 AND "month" <= 12),
	CONSTRAINT "payslips_year_check" CHECK("year" >= 2000 AND "year" <= 2100),
	CONSTRAINT "payslips_document_type_check" CHECK("document_type" IN (
        'SALARY',
        'EARNINGS',
        'NOTIFICATION',
        'SAC',
        'VACATION',
        'FINAL_SETTLEMENT',
        'ADJUSTMENT',
        'OTHER'
      )),
	CONSTRAINT "payslips_status_check" CHECK("status" IN (
        'PENDING',
        'ACTIVE',
        'ARCHIVED'
      ))
);
--> statement-breakpoint
INSERT INTO `__new_payslips`(`id`, `employee_id`, `year`, `month`, `document_type`, `title`, `status`, `created_by`, `created_at`, `updated_at`) SELECT `id`, `employee_id`, `year`, `month`, `document_type`, `title`, `status`, `created_by`, `created_at`, `updated_at` FROM `payslips`;--> statement-breakpoint
DROP TABLE `payslips`;--> statement-breakpoint
ALTER TABLE `__new_payslips` RENAME TO `payslips`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `payslips_employee_period_idx` ON `payslips` (`employee_id`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `payslips_status_idx` ON `payslips` (`status`);--> statement-breakpoint
CREATE INDEX `payslips_created_by_idx` ON `payslips` (`created_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_cuit_unique` ON `employees` (`cuit`);