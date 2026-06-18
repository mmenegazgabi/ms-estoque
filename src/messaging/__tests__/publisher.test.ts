import { NoopPublisher } from '../publisher';

describe('NoopPublisher', () => {
  it('records published events for assertions', async () => {
    const pub = new NoopPublisher();
    await pub.publish('supplier.created', { id: '1' });
    expect(pub.published).toEqual([{ type: 'supplier.created', payload: { id: '1' } }]);
  });
});
