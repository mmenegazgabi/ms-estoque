import { createSupplierSchema, listSuppliersQuerySchema, createReplenishmentSchema } from '../schemas';

describe('schemas', () => {
  it('accepts a valid supplier and infers documentType', () => {
    const parsed = createSupplierSchema.parse({
      legalName: 'Plus Fashion LTDA',
      document: '11.222.333/0001-81',
      email: 'contato@plus.com',
      address: { city: 'Porto Alegre', state: 'RS' },
    });
    expect(parsed.documentType).toBe('cnpj');
    expect(parsed.document).toBe('11222333000181');
  });

  it('rejects invalid document', () => {
    expect(() => createSupplierSchema.parse({
      legalName: 'X', document: '123', email: 'a@b.com',
    })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => createSupplierSchema.parse({
      legalName: 'X', document: '529.982.247-25', email: 'not-email',
    })).toThrow();
  });

  it('defaults pagination', () => {
    const q = listSuppliersQuerySchema.parse({});
    expect(q.page).toBe(1);
    expect(q.pageSize).toBe(20);
  });

  it('requires at least one replenishment item', () => {
    expect(() => createReplenishmentSchema.parse({ items: [] })).toThrow();
  });
});
