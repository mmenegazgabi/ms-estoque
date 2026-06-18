import { Pool, QueryResultRow } from 'pg';
import { Paginated, Supplier } from '../domain/types';
import { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput } from '../validation/schemas';

const mapRow = (r: QueryResultRow): Supplier => ({
  id: r.id,
  legalName: r.legal_name,
  tradeName: r.trade_name,
  document: r.document,
  documentType: r.document_type,
  email: r.email,
  phone: r.phone,
  contactPerson: r.contact_person,
  status: r.status,
  address: {
    street: r.address_street, number: r.address_number, complement: r.address_complement,
    district: r.address_district, city: r.address_city, state: r.address_state,
    zipCode: r.address_zip_code, country: r.address_country,
  },
  createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
});

export class SupplierRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<Supplier | null> {
    const { rows } = await this.pool.query('SELECT * FROM suppliers WHERE id = $1', [id]);
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const a = input.address ?? {};
    const { rows } = await this.pool.query(
      `INSERT INTO suppliers
        (legal_name, trade_name, document, document_type, email, phone, contact_person,
         address_street, address_number, address_complement, address_district,
         address_city, address_state, address_zip_code, address_country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [input.legalName, input.tradeName ?? null, input.document, input.documentType,
       input.email, input.phone ?? null, input.contactPerson ?? null,
       a.street ?? null, a.number ?? null, a.complement ?? null, a.district ?? null,
       a.city ?? null, a.state ?? null, a.zipCode ?? null, a.country ?? null],
    );
    return mapRow(rows[0]);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier | null> {
    const a = input.address ?? {};
    const { rows } = await this.pool.query(
      `UPDATE suppliers SET
         legal_name = COALESCE($2, legal_name),
         trade_name = COALESCE($3, trade_name),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         contact_person = COALESCE($6, contact_person),
         status = COALESCE($7, status),
         address_street = COALESCE($8, address_street),
         address_number = COALESCE($9, address_number),
         address_complement = COALESCE($10, address_complement),
         address_district = COALESCE($11, address_district),
         address_city = COALESCE($12, address_city),
         address_state = COALESCE($13, address_state),
         address_zip_code = COALESCE($14, address_zip_code),
         address_country = COALESCE($15, address_country),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, input.legalName ?? null, input.tradeName ?? null, input.email ?? null,
       input.phone ?? null, input.contactPerson ?? null, input.status ?? null,
       a.street ?? null, a.number ?? null, a.complement ?? null, a.district ?? null,
       a.city ?? null, a.state ?? null, a.zipCode ?? null, a.country ?? null],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async softDelete(id: string): Promise<Supplier | null> {
    const { rows } = await this.pool.query(
      `UPDATE suppliers SET status = 'inactive', updated_at = now() WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0] ? mapRow(rows[0]) : null;
  }

  async list(query: ListSuppliersQuery): Promise<Paginated<Supplier>> {
    const where: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      params.push(query.status);
      where.push(`status = $${params.length}`);
    }

    if (query.city) {
      params.push(`%${query.city}%`);
      where.push(`address_city ILIKE $${params.length}`);
    }

    if (query.state) {
      params.push(query.state);
      where.push(`address_state = $${params.length}`);
    }

    if (query.q) {
      // Push three separate params for the same wildcard value — one per ILIKE column.
      // This avoids any splice trick and keeps placeholder indices unambiguous.
      const like = `%${query.q}%`;
      params.push(like);
      const p1 = params.length;
      params.push(like);
      const p2 = params.length;
      params.push(like);
      const p3 = params.length;
      where.push(`(legal_name ILIKE $${p1} OR trade_name ILIKE $${p2} OR document ILIKE $${p3})`);
    }

    if (query.productId) {
      params.push(query.productId);
      where.push(`id IN (SELECT supplier_id FROM supplier_products WHERE product_id = $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRes = await this.pool.query(
      `SELECT count(*)::int AS total FROM suppliers ${whereSql}`,
      params,
    );
    const total = countRes.rows[0].total as number;

    const offset = (query.page - 1) * query.pageSize;
    const dataRes = await this.pool.query(
      `SELECT * FROM suppliers ${whereSql} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, query.pageSize, offset],
    );

    return { data: dataRes.rows.map(mapRow), page: query.page, pageSize: query.pageSize, total };
  }

  async findByDocument(document: string): Promise<Supplier | null> {
    const { rows } = await this.pool.query('SELECT * FROM suppliers WHERE document = $1', [document]);
    return rows[0] ? mapRow(rows[0]) : null;
  }
}
