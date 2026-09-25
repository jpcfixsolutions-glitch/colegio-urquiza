CREATE TABLE `announcement_areas` (
	`announcement_id` text NOT NULL,
	`area_id` text NOT NULL,
	CONSTRAINT `announcement_areas_pk` PRIMARY KEY(`announcement_id`, `area_id`),
	CONSTRAINT `fk_announcement_areas_announcement_id_announcements_id_fk` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_announcement_areas_area_id_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `announcement_reads` (
	`announcement_id` text NOT NULL,
	`user_id` text NOT NULL,
	`read_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `announcement_reads_pk` PRIMARY KEY(`announcement_id`, `user_id`),
	CONSTRAINT `fk_announcement_reads_announcement_id_announcements_id_fk` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_announcement_reads_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `announcements` (
	`id` text PRIMARY KEY,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`priority` text DEFAULT 'NORMAL' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`audience_type` text DEFAULT 'ALL' NOT NULL,
	`published_by` text,
	`published_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_announcements_published_by_users_id_fk` FOREIGN KEY (`published_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT "announcements_priority_check" CHECK("priority" IN (
        'NORMAL',
        'IMPORTANT',
        'URGENT'
      )),
	CONSTRAINT "announcements_status_check" CHECK("status" IN (
        'DRAFT',
        'PUBLISHED',
        'ARCHIVED'
      )),
	CONSTRAINT "announcements_audience_check" CHECK("audience_type" IN (
        'ALL',
        'AREAS'
      ))
);
--> statement-breakpoint
CREATE TABLE `areas` (
	`id` text PRIMARY KEY,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`metadata` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_audit_logs_actor_user_id_users_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`refresh_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_auth_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `employee_areas` (
	`employee_id` text NOT NULL,
	`area_id` text NOT NULL,
	`assigned_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `employee_areas_pk` PRIMARY KEY(`employee_id`, `area_id`),
	CONSTRAINT `fk_employee_areas_employee_id_employees_id_fk` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_employee_areas_area_id_areas_id_fk` FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY,
	`user_id` text,
	`employee_number` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `fk_employees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `payslip_versions` (
	`id` text PRIMARY KEY,
	`payslip_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`storage_bucket` text DEFAULT 'payslips' NOT NULL,
	`storage_path` text NOT NULL,
	`original_file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`uploaded_by` text,
	`uploaded_at` integer DEFAULT (unixepoch()) NOT NULL,
	`replaced_at` integer,
	CONSTRAINT `fk_payslip_versions_payslip_id_payslips_id_fk` FOREIGN KEY (`payslip_id`) REFERENCES `payslips`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_payslip_versions_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
	CONSTRAINT "payslip_versions_number_check" CHECK("version_number" >= 1),
	CONSTRAINT "payslip_versions_size_check" CHECK("size_bytes" >= 0),
	CONSTRAINT "payslip_versions_status_check" CHECK("status" IN (
        'PENDING',
        'ACTIVE',
        'REPLACED',
        'FAILED'
      ))
);
--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` text PRIMARY KEY,
	`employee_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`document_type` text DEFAULT 'SALARY' NOT NULL,
	`title` text,
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
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY,
	`code` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	CONSTRAINT `role_permissions_pk` PRIMARY KEY(`role_id`, `permission_id`),
	CONSTRAINT `fk_role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`description` text,
	`is_system` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	`assigned_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT `user_roles_pk` PRIMARY KEY(`user_id`, `role_id`),
	CONSTRAINT `fk_user_roles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_user_roles_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL,
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
CREATE INDEX `announcement_areas_announcement_idx` ON `announcement_areas` (`announcement_id`);--> statement-breakpoint
CREATE INDEX `announcement_areas_area_idx` ON `announcement_areas` (`area_id`);--> statement-breakpoint
CREATE INDEX `announcement_reads_announcement_idx` ON `announcement_reads` (`announcement_id`);--> statement-breakpoint
CREATE INDEX `announcement_reads_user_idx` ON `announcement_reads` (`user_id`);--> statement-breakpoint
CREATE INDEX `announcements_status_published_idx` ON `announcements` (`status`,`published_at`);--> statement-breakpoint
CREATE INDEX `announcements_expires_idx` ON `announcements` (`expires_at`);--> statement-breakpoint
CREATE INDEX `announcements_publisher_idx` ON `announcements` (`published_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `areas_code_unique` ON `areas` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `areas_name_unique` ON `areas` (`name`);--> statement-breakpoint
CREATE INDEX `areas_active_idx` ON `areas` (`active`);--> statement-breakpoint
CREATE INDEX `audit_logs_actor_idx` ON `audit_logs` (`actor_user_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_entity_idx` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_logs_created_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_logs_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_refresh_token_unique` ON `auth_sessions` (`refresh_token_hash`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expires_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `employee_areas_employee_idx` ON `employee_areas` (`employee_id`);--> statement-breakpoint
CREATE INDEX `employee_areas_area_idx` ON `employee_areas` (`area_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_user_unique` ON `employees` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_number_unique` ON `employees` (`employee_number`);--> statement-breakpoint
CREATE INDEX `employees_active_idx` ON `employees` (`active`);--> statement-breakpoint
CREATE INDEX `employees_name_idx` ON `employees` (`last_name`,`first_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `payslip_versions_path_unique` ON `payslip_versions` (`storage_path`);--> statement-breakpoint
CREATE UNIQUE INDEX `payslip_versions_number_unique` ON `payslip_versions` (`payslip_id`,`version_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `payslip_versions_one_active_unique` ON `payslip_versions` (`payslip_id`) WHERE "payslip_versions"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `payslip_versions_payslip_idx` ON `payslip_versions` (`payslip_id`);--> statement-breakpoint
CREATE INDEX `payslip_versions_status_idx` ON `payslip_versions` (`status`);--> statement-breakpoint
CREATE INDEX `payslip_versions_uploaded_by_idx` ON `payslip_versions` (`uploaded_by`);--> statement-breakpoint
CREATE INDEX `payslips_employee_period_idx` ON `payslips` (`employee_id`,`year`,`month`);--> statement-breakpoint
CREATE INDEX `payslips_status_idx` ON `payslips` (`status`);--> statement-breakpoint
CREATE INDEX `payslips_created_by_idx` ON `payslips` (`created_by`);--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_code_unique` ON `permissions` (`code`);--> statement-breakpoint
CREATE INDEX `role_permissions_role_idx` ON `role_permissions` (`role_id`);--> statement-breakpoint
CREATE INDEX `role_permissions_permission_idx` ON `role_permissions` (`permission_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE INDEX `user_roles_user_idx` ON `user_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_roles_role_idx` ON `user_roles` (`role_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (lower("username"));--> statement-breakpoint
CREATE INDEX `users_active_idx` ON `users` (`active`);