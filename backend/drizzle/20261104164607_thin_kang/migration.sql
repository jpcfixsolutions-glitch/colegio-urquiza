DROP INDEX IF EXISTS `employees_number_unique`;--> statement-breakpoint
ALTER TABLE `employees` DROP COLUMN `employee_number`;--> statement-breakpoint
ALTER TABLE `employees` DROP COLUMN `personal_email`;