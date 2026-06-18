import { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('suppliers', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    legal_name: { type: 'text', notNull: true },
    trade_name: { type: 'text' },
    document: { type: 'text', notNull: true, unique: true },
    document_type: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    phone: { type: 'text' },
    contact_person: { type: 'text' },
    status: { type: 'text', notNull: true, default: 'active' },
    address_street: { type: 'text' },
    address_number: { type: 'text' },
    address_complement: { type: 'text' },
    address_district: { type: 'text' },
    address_city: { type: 'text' },
    address_state: { type: 'text' },
    address_zip_code: { type: 'text' },
    address_country: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('suppliers', 'status');
  pgm.createIndex('suppliers', 'address_city');
  pgm.createIndex('suppliers', 'address_state');

  pgm.createTable('supplier_products', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    supplier_id: { type: 'uuid', notNull: true, references: 'suppliers', onDelete: 'CASCADE' },
    product_id: { type: 'text', notNull: true },
    supply_price: { type: 'numeric(12,2)' },
    lead_time_days: { type: 'integer' },
    supplier_sku: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('supplier_products', 'supplier_products_unique', {
    unique: ['supplier_id', 'product_id'],
  });
  pgm.createIndex('supplier_products', 'product_id');

  pgm.createTable('replenishment_orders', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    supplier_id: { type: 'uuid', notNull: true, references: 'suppliers', onDelete: 'CASCADE' },
    status: { type: 'text', notNull: true, default: 'requested' },
    total_cost: { type: 'numeric(12,2)' },
    ordered_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('replenishment_orders', 'supplier_id');
  pgm.createIndex('replenishment_orders', 'status');
  pgm.createIndex('replenishment_orders', 'ordered_at');

  pgm.createTable('replenishment_items', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    order_id: { type: 'uuid', notNull: true, references: 'replenishment_orders', onDelete: 'CASCADE' },
    product_id: { type: 'text', notNull: true },
    quantity: { type: 'integer', notNull: true, check: 'quantity > 0' },
    unit_cost: { type: 'numeric(12,2)' },
  });
  pgm.createIndex('replenishment_items', 'order_id');
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.dropTable('replenishment_items');
  pgm.dropTable('replenishment_orders');
  pgm.dropTable('supplier_products');
  pgm.dropTable('suppliers');
};
