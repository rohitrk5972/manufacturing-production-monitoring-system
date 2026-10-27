import { Request, Response, NextFunction } from 'express';
import { productionService } from '../services/production.service.js';

export class ProductionController {
  async listRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productionService.listRecords(req.query as any);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getRecordById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const record = await productionService.getRecordById(id);
      res.json(record);
    } catch (err) {
      next(err);
    }
  }

  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await productionService.createRecord(req.body);
      res.status(201).json(record);
    } catch (err) {
      next(err);
    }
  }

  async updateRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const updated = await productionService.updateRecord(id, req.body);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(String(req.params.id), 10);
      const result = await productionService.deleteRecord(id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const productionController = new ProductionController();
