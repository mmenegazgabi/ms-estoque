import { SupplierProduct } from '../domain/types';
import { MessagePublisher } from '../messaging/publisher';
import { SupplierProductRepository } from '../repositories/supplierProductRepository';
import { SupplierRepository } from '../repositories/supplierRepository';
import { LinkProductInput } from '../validation/schemas';
import { notFound } from '../middleware/errorHandler';

export class SupplierProductService {
  constructor(
    private repo: SupplierProductRepository,
    private supplierRepo: SupplierRepository,
    private publisher: MessagePublisher,
  ) {}

  private async ensureSupplier(supplierId: string): Promise<void> {
    const s = await this.supplierRepo.findById(supplierId);
    if (!s) throw notFound('Fornecedor não encontrado');
  }

  async link(supplierId: string, input: LinkProductInput): Promise<SupplierProduct> {
    await this.ensureSupplier(supplierId);
    const link = await this.repo.link(supplierId, input);
    await this.publisher.publish('supplier.product.linked', link);
    return link;
  }

  async unlink(supplierId: string, productId: string): Promise<void> {
    await this.ensureSupplier(supplierId);
    const removed = await this.repo.unlink(supplierId, productId);
    if (!removed) throw notFound('Vínculo não encontrado');
  }

  async listBySupplier(supplierId: string): Promise<SupplierProduct[]> {
    await this.ensureSupplier(supplierId);
    return this.repo.listBySupplier(supplierId);
  }

  async listByProduct(productId: string): Promise<SupplierProduct[]> {
    return this.repo.listByProduct(productId);
  }
}
