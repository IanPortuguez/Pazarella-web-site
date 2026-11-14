CREATE TABLE `inventory_products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`variants_json` text NOT NULL,
	`image_key` text,
	`version` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
