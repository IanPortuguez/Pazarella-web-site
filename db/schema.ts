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
  requestKey:text('request_key').unique(),
  requestHash:text('request_hash'),
  expiresAt:integer('expires_at'),
  deletedAt:text('deleted_at'),
  stockManaged:integer('stock_managed',{mode:'boolean'}).notNull().default(false),
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
  permissionsJson:text('permissions_json').notNull().default('[]'),
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

export const orderLines=sqliteTable('order_lines',{
 id:text('id').primaryKey(),
 orderId:text('order_id').notNull().references(()=>orders.id),
 productId:integer('product_id').notNull(),
 color:text('color').notNull(),size:text('size').notNull(),
 quantity:integer('quantity').notNull(),unitPrice:integer('unit_price').notNull(),
 reservationState:text('reservation_state').notNull().default('reserved'),
});
