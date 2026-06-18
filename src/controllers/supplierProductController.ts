import { NextFunction, Request, Response } from 'express';
import { SupplierProductService } from '../services/supplierProductService';
import { linkProductSchema } from '../validation/schemas';

export class SupplierProductController {
  constructor(private service: SupplierProductService) {}

  link = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = linkProductSchema.parse(req.body);
      res.status(201).json(await this.service.link(req.params.id, input));
    } catch (e) { next(e); }
  };

  unlink = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.service.unlink(req.params.id, req.params.productId);
      res.status(204).send();
    } catch (e) { next(e); }
  };

  listBySupplier = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await this.service.listBySupplier(req.params.id)); } catch (e) { next(e); }
  };

  listByProduct = async (req: Request, res: Response, next: NextFunction) => {
    try { res.json(await this.service.listByProduct(req.params.productId)); } catch (e) { next(e); }
  };
}
