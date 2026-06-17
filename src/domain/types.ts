export type SupplierStatus = 'active' | 'inactive';
export type DocumentType = 'cnpj' | 'cpf';
export type ReplenishmentStatus = 'requested' | 'sent' | 'received' | 'cancelled';

export interface Address {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
}

export interface Supplier {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
  documentType: DocumentType;
  email: string;
  phone: string | null;
  contactPerson: string | null;
  status: SupplierStatus;
  address: Address;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  supplyPrice: number | null;
  leadTimeDays: number | null;
  supplierSku: string | null;
  createdAt: string;
}

export interface ReplenishmentItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitCost: number | null;
}

export interface ReplenishmentOrder {
  id: string;
  supplierId: string;
  status: ReplenishmentStatus;
  totalCost: number | null;
  orderedAt: string;
  items: ReplenishmentItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthIdentity {
  userId: string | null;
  email: string | null;
  roles: string[];
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}
