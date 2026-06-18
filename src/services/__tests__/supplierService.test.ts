import { SupplierService } from '../supplierService';
import { NoopPublisher } from '../../messaging/publisher';

const sampleSupplier = {
  id: 'id1', legalName: 'Plus', tradeName: null, document: '11222333000181',
  documentType: 'cnpj' as const, email: 'a@b.com', phone: null, contactPerson: null,
  status: 'active' as const, address: {}, createdAt: 'now', updatedAt: 'now',
};

const makeRepo = () => ({
  findByDocument: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue(sampleSupplier),
  findById: jest.fn().mockResolvedValue(sampleSupplier),
  update: jest.fn().mockResolvedValue(sampleSupplier),
  softDelete: jest.fn().mockResolvedValue(sampleSupplier),
  list: jest.fn().mockResolvedValue({ data: [sampleSupplier], page: 1, pageSize: 20, total: 1 }),
});

describe('SupplierService.create', () => {
  it('creates and publishes supplier.created', async () => {
    const repo = makeRepo();
    const pub = new NoopPublisher();
    const svc = new SupplierService(repo as never, pub);
    const result = await svc.create({
      legalName: 'Plus', document: '11222333000181', documentType: 'cnpj', email: 'a@b.com',
    } as never);
    expect(result.id).toBe('id1');
    expect(pub.published[0].type).toBe('supplier.created');
  });

  it('throws 409 when document already exists', async () => {
    const repo = makeRepo();
    repo.findByDocument.mockResolvedValue(sampleSupplier);
    const svc = new SupplierService(repo as never, new NoopPublisher());
    await expect(svc.create({
      legalName: 'Plus', document: '11222333000181', documentType: 'cnpj', email: 'a@b.com',
    } as never)).rejects.toMatchObject({ status: 409 });
  });
});

describe('SupplierService.getById', () => {
  it('throws 404 when missing', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(null);
    const svc = new SupplierService(repo as never, new NoopPublisher());
    await expect(svc.getById('nope')).rejects.toMatchObject({ status: 404 });
  });
});
