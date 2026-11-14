CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`customer_name` text NOT NULL,
	`address` text NOT NULL,
	`phone` text NOT NULL,
	`payment_method` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`items_json` text NOT NULL,
	`subtotal` integer NOT NULL
);
