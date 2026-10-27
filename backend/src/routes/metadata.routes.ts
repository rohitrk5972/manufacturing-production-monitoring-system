import { Router } from 'express';
import { metadataController } from '../controllers/metadata.controller.js';

export const metadataRouter = Router();

metadataRouter.get('/lines', (req, res, next) => metadataController.getLines(req, res, next));
metadataRouter.get('/products', (req, res, next) => metadataController.getProducts(req, res, next));
metadataRouter.get('/shifts', (req, res, next) => metadataController.getShifts(req, res, next));
metadataRouter.get('/line-products', (req, res, next) => metadataController.getLineProducts(req, res, next));
metadataRouter.get('/lines/:id/active-product', (req, res, next) => metadataController.getActiveProduct(req, res, next));
metadataRouter.get('/lines/:id/recorded-shifts', (req, res, next) => metadataController.getRecordedShifts(req, res, next));
