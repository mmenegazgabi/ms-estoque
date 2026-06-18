import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { Pool } from 'pg';
import { MessagePublisher } from '../messaging/publisher';
import { SupplierRepository } from '../repositories/supplierRepository';
import { SupplierProductRepository } from '../repositories/supplierProductRepository';
import { ReplenishmentRepository } from '../repositories/replenishmentRepository';
import { SupplierService } from '../services/supplierService';
import { SupplierProductService } from '../services/supplierProductService';
import { ReplenishmentService } from '../services/replenishmentService';
import { SupplierController } from '../controllers/supplierController';
import { SupplierProductController } from '../controllers/supplierProductController';
import { ReplenishmentController } from '../controllers/replenishmentController';
import { requireAuth, requireWrite } from '../middleware/auth';
import { openapiSpec } from '../docs/openapi';

export function buildRouter(pool: Pool, publisher: MessagePublisher): Router {
  const supplierRepo = new SupplierRepository(pool);
  const productRepo = new SupplierProductRepository(pool);
  const repRepo = new ReplenishmentRepository(pool);

  const supplier = new SupplierController(new SupplierService(supplierRepo, publisher));
  const product = new SupplierProductController(new SupplierProductService(productRepo, supplierRepo, publisher));
  const replenishment = new ReplenishmentController(new ReplenishmentService(repRepo, supplierRepo, publisher));

  const router = Router();

  router.get('/health', (_req, res) => res.json({ status: 'ok' }));
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  // Suppliers
  router.post('/suppliers', requireAuth, requireWrite, supplier.create);
  router.get('/suppliers', requireAuth, supplier.list);
  router.get('/suppliers/:id', requireAuth, supplier.getById);
  router.put('/suppliers/:id', requireAuth, requireWrite, supplier.update);
  router.patch('/suppliers/:id', requireAuth, requireWrite, supplier.update);
  router.delete('/suppliers/:id', requireAuth, requireWrite, supplier.remove);

  // Supplier ↔ products
  router.post('/suppliers/:id/products', requireAuth, requireWrite, product.link);
  router.get('/suppliers/:id/products', requireAuth, product.listBySupplier);
  router.delete('/suppliers/:id/products/:productId', requireAuth, requireWrite, product.unlink);
  router.get('/products/:productId/suppliers', requireAuth, product.listByProduct);

  // Replenishments
  router.post('/suppliers/:id/replenishments', requireAuth, requireWrite, replenishment.create);
  router.get('/suppliers/:id/replenishments', requireAuth, replenishment.list);

  return router;
}
