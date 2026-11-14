CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`product_id` integer NOT NULL,
	`color` text NOT NULL,
	`size` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`reservation_state` text DEFAULT 'reserved' NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `orders` ADD `request_key` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `request_hash` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `expires_at` integer;--> statement-breakpoint
ALTER TABLE `orders` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `orders` ADD `stock_managed` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_request_key_unique` ON `orders` (`request_key`);--> statement-breakpoint
ALTER TABLE `users` ADD `permissions_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
UPDATE users SET role= CASE WHEN id=(SELECT id FROM users ORDER BY created_at,id LIMIT 1) THEN 'owner' ELSE 'staff' END, permissions_json='["orders.read","orders.manage","inventory.read","inventory.manage"]';
--> statement-breakpoint
CREATE UNIQUE INDEX users_single_owner ON users(role) WHERE role='owner';
--> statement-breakpoint
CREATE INDEX order_lines_order ON order_lines(order_id);
--> statement-breakpoint
CREATE INDEX order_lines_product ON order_lines(product_id);
--> statement-breakpoint
CREATE INDEX orders_pending_expiry ON orders(status,expires_at);
--> statement-breakpoint
CREATE TRIGGER reserve_stock_check BEFORE INSERT ON order_lines BEGIN
 SELECT CASE WHEN NEW.quantity<1 OR NEW.quantity!=CAST(NEW.quantity AS INTEGER) THEN RAISE(ABORT,'INVALID_QUANTITY') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM orders WHERE id=NEW.order_id AND status='pending' AND stock_managed=1 AND deleted_at IS NULL) THEN RAISE(ABORT,'INVALID_ORDER') END;
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM inventory_products p,json_each(p.variants_json) v WHERE p.id=NEW.product_id AND json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size AND json_extract(v.value,'$.quantity')>=NEW.quantity AND COALESCE(json_extract(v.value,'$.price'),p.price)=NEW.unit_price) THEN RAISE(ABORT,'STOCK_OR_PRICE_CHANGED') END;
END;
--> statement-breakpoint
CREATE TRIGGER reserve_stock AFTER INSERT ON order_lines BEGIN
 UPDATE inventory_products SET variants_json=(SELECT json_group_array(json( CASE WHEN json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size THEN json_set(v.value,'$.quantity',json_extract(v.value,'$.quantity')-NEW.quantity) ELSE v.value END )) FROM json_each(variants_json) v), version=version+1 WHERE id=NEW.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER release_stock AFTER UPDATE OF reservation_state ON order_lines WHEN NEW.reservation_state='released' AND OLD.reservation_state!='released' BEGIN
 UPDATE inventory_products SET variants_json=(SELECT json_group_array(json( CASE WHEN json_extract(v.value,'$.color')=NEW.color AND json_extract(v.value,'$.size')=NEW.size THEN json_set(v.value,'$.quantity',json_extract(v.value,'$.quantity')+NEW.quantity) ELSE v.value END )) FROM json_each(variants_json) v), version=version+1 WHERE id=NEW.product_id;
END;
--> statement-breakpoint
CREATE TRIGGER cannot_reopen_cancelled BEFORE UPDATE OF status ON orders WHEN OLD.status='cancelled' AND NEW.status!='cancelled' BEGIN SELECT RAISE(ABORT,'ORDER_CANCELLED'); END;
--> statement-breakpoint
CREATE TRIGGER order_stock_state AFTER UPDATE OF status ON orders WHEN NEW.status!=OLD.status AND NEW.stock_managed=1 BEGIN
 UPDATE order_lines SET reservation_state= CASE WHEN NEW.status='paid' THEN 'sold' WHEN NEW.status='pending' THEN 'reserved' WHEN NEW.status='cancelled' THEN 'released' ELSE reservation_state END WHERE order_id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER protect_reserved_product BEFORE DELETE ON inventory_products WHEN EXISTS(SELECT 1 FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE l.product_id=OLD.id AND o.deleted_at IS NULL AND l.reservation_state!='released') BEGIN SELECT RAISE(ABORT,'PRODUCT_HAS_ACTIVE_ORDERS'); END;
--> statement-breakpoint
CREATE TRIGGER protect_reserved_variants BEFORE UPDATE OF variants_json ON inventory_products WHEN EXISTS(SELECT 1 FROM order_lines l JOIN orders o ON o.id=l.order_id WHERE l.product_id=OLD.id AND o.deleted_at IS NULL AND l.reservation_state!='released' AND NOT EXISTS(SELECT 1 FROM json_each(NEW.variants_json) v WHERE json_extract(v.value,'$.color')=l.color AND json_extract(v.value,'$.size')=l.size)) BEGIN SELECT RAISE(ABORT,'VARIANT_HAS_ACTIVE_ORDERS'); END;
