import { Pool, QueryResultRow } from 'pg';
import { ReplenishmentItem, ReplenishmentOrder } from '../domain/types';
import { CreateReplenishmentInput, ListReplenishmentsQuery } from '../validation/schemas';

const mapItem = (r: QueryResultRow): ReplenishmentItem => ({
  id: r.id, orderId: r.order_id, productId: r.product_id,
  quantity: r.quantity, unitCost: r.unit_cost === null ? null : Number(r.unit_cost),
});

const mapOrder = (r: QueryResultRow, items: ReplenishmentItem[]): ReplenishmentOrder => ({
  id: r.id, supplierId: r.supplier_id, status: r.status,
  totalCost: r.total_cost === null ? null : Number(r.total_cost),
  orderedAt: r.ordered_at instanceof Date ? r.ordered_at.toISOString() : r.ordered_at,
  items,
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
});

export class ReplenishmentRepository {
  constructor(private pool: Pool) {}

  async create(
    supplierId: string,
    input: CreateReplenishmentInput,
    totalCost: number | null,
  ): Promise<ReplenishmentOrder> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const orderRes = await client.query(
        `INSERT INTO replenishment_orders (supplier_id, status, total_cost, ordered_at)
         VALUES ($1,$2,$3,COALESCE($4, now())) RETURNING *`,
        [supplierId, input.status, totalCost, input.orderedAt ?? null],
      );
      const order = orderRes.rows[0];
      const items: ReplenishmentItem[] = [];
      for (const it of input.items) {
        const itemRes = await client.query(
          `INSERT INTO replenishment_items (order_id, product_id, quantity, unit_cost)
           VALUES ($1,$2,$3,$4) RETURNING *`,
          [order.id, it.productId, it.quantity, it.unitCost ?? null],
        );
        items.push(mapItem(itemRes.rows[0]));
      }
      await client.query('COMMIT');
      return mapOrder(order, items);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listBySupplier(supplierId: string, query: ListReplenishmentsQuery): Promise<ReplenishmentOrder[]> {
    const where = ['supplier_id = $1'];
    const params: unknown[] = [supplierId];
    if (query.status) { params.push(query.status); where.push(`status = $${params.length}`); }
    if (query.from) { params.push(query.from); where.push(`ordered_at >= $${params.length}`); }
    if (query.to) { params.push(query.to); where.push(`ordered_at <= $${params.length}`); }

    const ordersRes = await this.pool.query(
      `SELECT * FROM replenishment_orders WHERE ${where.join(' AND ')} ORDER BY ordered_at DESC`, params);
    const orders: ReplenishmentOrder[] = [];
    for (const o of ordersRes.rows) {
      const itemsRes = await this.pool.query(
        'SELECT * FROM replenishment_items WHERE order_id = $1', [o.id]);
      orders.push(mapOrder(o, itemsRes.rows.map(mapItem)));
    }
    return orders;
  }
}
