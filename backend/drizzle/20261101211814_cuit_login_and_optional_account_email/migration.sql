ALTER TABLE `employees` ADD `cuit_normalized` text;--> statement-breakpoint
-- El valor visual se conserva; esta columna se usa únicamente para comparar
-- CUIT sin separadores. Se conservan sólo dígitos para cubrir cualquier
-- separador de presentación. Si hubiera una colisión, el índice único
-- siguiente detiene la migración en vez de elegir una cuenta arbitraria.
WITH RECURSIVE `cuit_digits`(`id`, `position`, `normalized`) AS (
  SELECT `id`, 1, '' FROM `employees`
  UNION ALL
  SELECT `employees`.`id`, `position` + 1,
    `normalized` || CASE WHEN substr(`employees`.`cuit`, `position`, 1) GLOB '[0-9]' THEN substr(`employees`.`cuit`, `position`, 1) ELSE '' END
  FROM `cuit_digits`
  JOIN `employees` ON `employees`.`id` = `cuit_digits`.`id`
  WHERE `position` <= length(`employees`.`cuit`)
)
UPDATE `employees`
SET `cuit_normalized` = (
  SELECT CASE WHEN length(`normalized`) = 11 THEN `normalized` ELSE NULL END FROM `cuit_digits`
  WHERE `cuit_digits`.`id` = `employees`.`id`
    AND `position` = length(`employees`.`cuit`) + 1
)
WHERE `cuit` IS NOT NULL;--> statement-breakpoint
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
CREATE INDEX `users_active_idx` ON `users` (`active`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_cuit_normalized_unique` ON `employees` (`cuit_normalized`);
