import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { validateQuery } from '../middleware/validate.js';
import { analyticsFilterSchema } from '../validators/production.validator.js';

export const analyticsRouter = Router();

analyticsRouter.get(
  '/kpis',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getKPIs(req, res, next)
);

analyticsRouter.get(
  '/daily-production',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getDailyProduction(req, res, next)
);

analyticsRouter.get(
  '/monthly-production',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getMonthlyProduction(req, res, next)
);

analyticsRouter.get(
  '/shift-comparison',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getShiftComparison(req, res, next)
);

analyticsRouter.get(
  '/product-comparison',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getProductComparison(req, res, next)
);

analyticsRouter.get(
  '/line-comparison',
  validateQuery(analyticsFilterSchema),
  (req, res, next) => analyticsController.getLineComparison(req, res, next)
);
