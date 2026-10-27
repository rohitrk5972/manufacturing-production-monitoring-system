import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service.js';

export class AnalyticsController {
  async getKPIs(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getKPIs(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getDailyProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDailyProduction(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getDailyByLineAndProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getDailyByLineAndProduct(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getMonthlyProduction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getMonthlyProduction(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getShiftComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getShiftComparison(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getProductComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getProductComparison(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getLineComparison(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getLineComparison(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }

  async getLineSpeedTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await analyticsService.getLineSpeedTrends(req.query as any);
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
