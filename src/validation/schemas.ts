import { z } from 'zod';
import { classifyDocument, onlyDigits } from './document';

const addressSchema = z.object({
  street: z.string().max(255).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(255).optional().nullable(),
  district: z.string().max(120).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(60).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().max(60).optional().nullable(),
}).partial();

const documentField = z.string().transform((v) => onlyDigits(v)).refine(
  (v) => classifyDocument(v) !== null,
  { message: 'documento inválido (CPF ou CNPJ)' },
);

export const createSupplierSchema = z.object({
  legalName: z.string().min(1).max(255),
  tradeName: z.string().max(255).optional().nullable(),
  document: documentField,
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  contactPerson: z.string().max(255).optional().nullable(),
  address: addressSchema.optional(),
}).transform((data) => ({
  ...data,
  documentType: classifyDocument(data.document) as 'cnpj' | 'cpf',
}));

export const updateSupplierSchema = z.object({
  legalName: z.string().min(1).max(255).optional(),
  tradeName: z.string().max(255).optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().max(40).optional().nullable(),
  contactPerson: z.string().max(255).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  address: addressSchema.optional(),
});

export const listSuppliersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'inactive']).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  productId: z.string().optional(),
  q: z.string().optional(),
});

export const linkProductSchema = z.object({
  productId: z.string().min(1),
  supplyPrice: z.number().nonnegative().optional().nullable(),
  leadTimeDays: z.number().int().nonnegative().optional().nullable(),
  supplierSku: z.string().max(120).optional().nullable(),
});

export const createReplenishmentSchema = z.object({
  status: z.enum(['requested', 'sent', 'received', 'cancelled']).default('requested'),
  orderedAt: z.string().datetime().optional(),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
    unitCost: z.number().nonnegative().optional().nullable(),
  })).min(1),
});

export const listReplenishmentsQuerySchema = z.object({
  status: z.enum(['requested', 'sent', 'received', 'cancelled']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
export type LinkProductInput = z.infer<typeof linkProductSchema>;
export type CreateReplenishmentInput = z.infer<typeof createReplenishmentSchema>;
export type ListReplenishmentsQuery = z.infer<typeof listReplenishmentsQuerySchema>;
