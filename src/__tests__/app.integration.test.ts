import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app';
import { NoopPublisher } from '../messaging/publisher';
import { env } from '../config/env';

const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, env.jwtSecret);
const auth = { Authorization: `Bearer ${token}` };

const supplierRow = {
  id: 'id1', legal_name: 'Plus', trade_name: null, document: '11222333000181',
  document_type: 'cnpj', email: 'a@b.com', phone: null, contact_person: null, status: 'active',
  address_street: null, address_number: null, address_complement: null, address_district: null,
  address_city: 'POA', address_state: 'RS', address_zip_code: null, address_country: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

// Minimal stub Pool: route SQL by inspecting the query text.
function makePool() {
  return {
    query: jest.fn(async (sql: string) => {
      if (sql.includes('WHERE document =')) return { rows: [], rowCount: 0 };       // findByDocument → none
      if (sql.startsWith('INSERT INTO suppliers')) return { rows: [supplierRow], rowCount: 1 };
      if (sql.includes('count(*)')) return { rows: [{ total: 1 }], rowCount: 1 };
      if (sql.startsWith('SELECT * FROM suppliers')) return { rows: [supplierRow], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }),
    connect: jest.fn(),
  };
}

describe('Supplier API', () => {
  it('401 without auth', async () => {
    const app = createApp(makePool() as never, new NoopPublisher());
    await request(app).get('/suppliers').expect(401);
  });

  it('GET /health is public', async () => {
    const app = createApp(makePool() as never, new NoopPublisher());
    await request(app).get('/health').expect(200, { status: 'ok' });
  });

  it('creates a supplier (201) with valid payload', async () => {
    const app = createApp(makePool() as never, new NoopPublisher());
    const res = await request(app).post('/suppliers').set(auth).send({
      legalName: 'Plus Fashion LTDA', document: '11.222.333/0001-81', email: 'contato@plus.com',
    });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('id1');
  });

  it('400 on invalid document', async () => {
    const app = createApp(makePool() as never, new NoopPublisher());
    const res = await request(app).post('/suppliers').set(auth).send({
      legalName: 'X', document: '123', email: 'a@b.com',
    });
    expect(res.status).toBe(400);
  });

  it('lists suppliers (200, paginated)', async () => {
    const app = createApp(makePool() as never, new NoopPublisher());
    const res = await request(app).get('/suppliers').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].legalName).toBe('Plus');
  });
});
