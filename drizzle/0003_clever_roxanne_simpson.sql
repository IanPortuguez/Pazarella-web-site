CREATE TABLE `inventory_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_options_kind_name` ON `inventory_options` (`kind`,`name`);
--> statement-breakpoint
INSERT OR IGNORE INTO inventory_options(kind,name) VALUES ('size','XS'),('size','S'),('size','M'),('size','L'),('size','XL'),('size','XXL'),('color','Negro'),('color','Blanco'),('color','Rosa'),('color','Vino'),('color','Beige');
--> statement-breakpoint
INSERT OR IGNORE INTO inventory_options(kind,name) SELECT 'size',json_extract(j.value,'$.size') FROM inventory_products p,json_each(p.variants_json) j;
--> statement-breakpoint
INSERT OR IGNORE INTO inventory_options(kind,name) SELECT 'color',json_extract(j.value,'$.color') FROM inventory_products p,json_each(p.variants_json) j;
