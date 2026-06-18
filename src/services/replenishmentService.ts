import { ReplenishmentOrder } from '../domain/types';
import { MessagePublisher } from '../messaging/publisher';
import { ReplenishmentRepository } from '../repositories/replenishmentRepository';
import { SupplierRepository } from '../repositories/supplierRepository';
import { CreateReplenishmentInput, ListReplenishmentsQuery } from '../validation/schemas';
import { notFound } from '../middleware/errorHandler';

export class ReplenishmentService {
  constructor(
    private repo: ReplenishmentRepository,
    private supplierRepo: SupplierRepository,
    private publisher: MessagePublisher,
  ) {}

  private computeTotal(input: CreateReplenishmentInput): number | null {
    const hasCosts = input.items.every((i) => typeof i.unitCost === 'number');
    if (!hasCosts) return null;
    return input.items.reduce((sum, i) => sum + i.quantity * (i.unitCost as number), 0);
  }

  async create(supplierId: string, input: CreateReplenishmentInput): Promise<ReplenishmentOrder> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier) throw notFound('Fornecedor não encontrado');
    const total = this.computeTotal(input);
    const order = await this.repo.create(supplierId, input, total);
    await this.publisher.publish('replenishment.created', order);
    return order;
  }

  async listBySupplier(supplierId: string, query: ListReplenishmentsQuery): Promise<ReplenishmentOrder[]> {
    const supplier = await this.supplierRepo.findById(supplierId);
    if (!supplier) throw notFound('Fornecedor não encontrado');
    return this.repo.listBySupplier(supplierId, query);
  }
}
