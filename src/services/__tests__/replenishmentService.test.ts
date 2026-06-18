import { ReplenishmentService } from '../replenishmentService';
import { NoopPublisher } from '../../messaging/publisher';

describe('ReplenishmentService.create', () => {
  it('computes total cost from items and validates supplier exists', async () => {
    const supplierRepo = { findById: jest.fn().mockResolvedValue({ id: 's1' }) };
    const repRepo = { create: jest.fn().mockImplementation((_s, _i, total) =>
      Promise.resolve({ id: 'o1', supplierId: 's1', status: 'requested', totalCost: total, items: [], orderedAt: 'now', createdAt: 'now', updatedAt: 'now' })) };
    const pub = new NoopPublisher();
    const svc = new ReplenishmentService(repRepo as never, supplierRepo as never, pub);
    const order = await svc.create('s1', {
      status: 'requested',
      items: [
        { productId: 'p1', quantity: 2, unitCost: 10 },
        { productId: 'p2', quantity: 3, unitCost: 5 },
      ],
    } as never);
    expect(order.totalCost).toBe(35);
    expect(pub.published[0].type).toBe('replenishment.created');
  });

  it('throws 404 when supplier missing', async () => {
    const supplierRepo = { findById: jest.fn().mockResolvedValue(null) };
    const svc = new ReplenishmentService({ create: jest.fn() } as never, supplierRepo as never, new NoopPublisher());
    await expect(svc.create('x', { status: 'requested', items: [{ productId: 'p', quantity: 1 }] } as never))
      .rejects.toMatchObject({ status: 404 });
  });
});
