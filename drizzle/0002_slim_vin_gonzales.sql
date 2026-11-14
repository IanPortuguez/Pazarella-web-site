CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_unique` ON `categories` (`name`);--> statement-breakpoint
INSERT OR IGNORE INTO categories (name) VALUES ('Lencería'),('Pijamas'),('Ropa femenina'),('Accesorios');
--> statement-breakpoint
INSERT OR IGNORE INTO categories (name) SELECT DISTINCT category FROM inventory_products;
