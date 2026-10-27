ALTER TABLE `employees` ADD `dni` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `personal_email` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `address` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `marital_status` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `profile_updated_at` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `employees_dni_unique` ON `employees` (`dni`);