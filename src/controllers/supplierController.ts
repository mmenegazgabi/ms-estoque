import { NextFunction, Request, Response } from 'express';
import { SupplierService } from '../services/supplierService';
import { createSupplierSchema, listSuppliersQuerySchema, updateSupplierSchema } from '../validation/schemas';

export class SupplierController {
  constructor(private service: SupplierService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createSupplierSchema.parse(req.body);
      const supplier = await this.service.create(input);
      res.status(201).json(supplier);
    } catch (e) { next(e); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listSuppliersQuerySchema.parse(req.query);
      res.json(await this.service.list(query));
    } catch (e) { next(e); }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await this.service.getById(req.params.id)); } catch (e) { next(e); }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateSupplierSchema.parse(req.body);
      res.json(await this.service.update(req.params.id, input));
    } catch (e) { next(e); }
  };

  remove = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await this.service.inactivate(req.params.id)); } catch (e) { next(e); }
  };
}
