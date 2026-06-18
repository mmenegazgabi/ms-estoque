import { NextFunction, Request, Response } from 'express';
import { ReplenishmentService } from '../services/replenishmentService';
import { createReplenishmentSchema, listReplenishmentsQuerySchema } from '../validation/schemas';

export class ReplenishmentController {
  constructor(private service: ReplenishmentService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createReplenishmentSchema.parse(req.body);
      res.status(201).json(await this.service.create(req.params.id, input));
    } catch (e) { next(e); }
  };

  list = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listReplenishmentsQuerySchema.parse(req.query);
      res.json(await this.service.listBySupplier(req.params.id, query));
    } catch (e) { next(e); }
  };
}
