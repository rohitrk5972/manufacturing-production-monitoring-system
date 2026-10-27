import { Request, Response, NextFunction } from 'express';
import { metadataService } from '../services/metadata.service.js';

export class MetadataController {
  async getLines(_req: Request, res: Response, next: NextFunction) {
    try {
      const lines = await metadataService.getLines();
      res.json(lines);
    } catch (err) {
      next(err);
    }
  }

  async getProducts(_req: Request, res: Response, next: NextFunction) {
    try {
      const products = await metadataService.getProducts();
      res.json(products);
    } catch (err) {
      next(err);
    }
  }

  async getShifts(_req: Request, res: Response, next: NextFunction) {
    try {
      const shifts = await metadataService.getShifts();
      res.json(shifts);
    } catch (err) {
      next(err);
    }
  }

  async getLineProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const lineId = req.query.line_id ? parseInt(String(req.query.line_id), 10) : undefined;
      const mappings = await metadataService.getLineProducts(lineId);
      res.json(mappings);
    } catch (err) {
      next(err);
    }
  }

  async getActiveProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const lineId = parseInt(String(req.params.id), 10);
      const date = String(req.query.date || '');
      if (!lineId || !date) {
        res.status(400).json({ error: 'lineId and date query parameter are required' });
        return;
      }
      const active = await metadataService.getActiveProductForLineAndDate(lineId, date);
      res.json(active);
    } catch (err) {
      next(err);
    }
  }

  async getRecordedShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const lineId = parseInt(String(req.params.id), 10);
      const date = String(req.query.date || '');
      if (!lineId || !date) {
        res.status(400).json({ error: 'lineId and date query parameter are required' });
        return;
      }
      const recorded = await metadataService.getRecordedShiftsForLineAndDate(lineId, date);
      res.json(recorded);
    } catch (err) {
      next(err);
    }
  }
}

export const metadataController = new MetadataController();
