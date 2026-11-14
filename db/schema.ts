import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  customerName: text('customer_name').notNull(),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('pending'),
  itemsJson: text('items_json').notNull(),
  subtotal: integer('subtotal').notNull(),
});
export const inventoryProducts = sqliteTable('inventory_products', {
  id: integer('id').primaryKey({autoIncrement:true}),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: integer('price').notNull(),
  variantsJson: text('variants_json').notNull(),
  imageKey: text('image_key'),
  version: integer('version').notNull().default(0),
  createdAt: text('created_at').notNull(),
});

export const categories = sqliteTable('categories', {id: integer('id').primaryKey({autoIncrement:true}), name:text('name').notNull().unique()});
export const inventoryOptions = sqliteTable('inventory_options', {id:integer('id').primaryKey({autoIncrement:true}),kind:text('kind').notNull(),name:text('name').notNull()},table=>[uniqueIndex('inventory_options_kind_name').on(table.kind,table.name)]);

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  passwordSalt: text('password_salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  passwordIterations: integer('password_iterations').notNull().default(100000),
  role: text('role').notNull().default('admin'),
  active: integer('active',{mode:'boolean'}).notNull().default(true),
  createdAt: text('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  expiresAt: integer('expires_at').notNull(),
});
export const authRateLimits = sqliteTable('auth_rate_limits', {
  key:text('key').primaryKey(),
  count:integer('count').notNull(),
  expiresAt:integer('expires_at').notNull(),
});
