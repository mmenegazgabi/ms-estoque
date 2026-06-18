import { Paginated, Supplier } from '../domain/types';
import { MessagePublisher } from '../messaging/publisher';
import { SupplierRepository } from '../repositories/supplierRepository';
import { CreateSupplierInput, ListSuppliersQuery, UpdateSupplierInput } from '../validation/schemas';
import { conflict, notFound } from '../middleware/errorHandler';

export class SupplierService {
  constructor(private repo: SupplierRepository, private publisher: MessagePublisher) {}

  async create(input: CreateSupplierInput): Promise<Supplier> {
    const existing = await this.repo.findByDocument(input.document);
    if (existing) throw conflict('Já existe fornecedor com este documento');
    const supplier = await this.repo.create(input);
    await this.publisher.publish('supplier.created', supplier);
    return supplier;
  }

  async getById(id: string): Promise<Supplier> {
    const supplier = await this.repo.findById(id);
    if (!supplier) throw notFound('Fornecedor não encontrado');
    return supplier;
  }

  async list(query: ListSuppliersQuery): Promise<Paginated<Supplier>> {
    return this.repo.list(query);
  }

  async update(id: string, input: UpdateSupplierInput): Promise<Supplier> {
    const updated = await this.repo.update(id, input);
    if (!updated) throw notFound('Fornecedor não encontrado');
    await this.publisher.publish('supplier.updated', updated);
    return updated;
  }

  async inactivate(id: string): Promise<Supplier> {
    const updated = await this.repo.softDelete(id);
    if (!updated) throw notFound('Fornecedor não encontrado');
    await this.publisher.publish('supplier.inactivated', updated);
    return updated;
  }
}
