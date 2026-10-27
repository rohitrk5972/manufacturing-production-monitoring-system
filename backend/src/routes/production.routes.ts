import { Router } from 'express';
import { productionController } from '../controllers/production.controller.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createProductionRecordSchema,
  updateProductionRecordSchema,
  productionFilterSchema,
} from '../validators/production.validator.js';

export const productionRouter = Router();

productionRouter.get(
  '/',
  validateQuery(productionFilterSchema),
  (req, res, next) => productionController.listRecords(req, res, next)
);

productionRouter.get(
  '/export/csv',
  validateQuery(productionFilterSchema),
  (req, res, next) => productionController.exportCsv(req, res, next)
);

productionRouter.get(
  '/:id',
  (req, res, next) => productionController.getRecordById(req, res, next)
);

productionRouter.post(
  '/',
  validateBody(createProductionRecordSchema),
  (req, res, next) => productionController.createRecord(req, res, next)
);

productionRouter.put(
  '/:id',
  validateBody(updateProductionRecordSchema),
  (req, res, next) => productionController.updateRecord(req, res, next)
);

productionRouter.delete(
  '/:id',
  (req, res, next) => productionController.deleteRecord(req, res, next)
);
