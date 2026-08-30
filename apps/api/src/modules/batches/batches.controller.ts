import { Request, Response, NextFunction } from 'express';
import { batchesService } from './batches.service';
import { CreateDeliveryBatchSchema, BatchStatus } from '@quickcommerce/shared';

export class BatchesController {
  async listBatches(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await batchesService.listBatches({
        storeId: (req.query.storeId as string) || req.user?.storeId,
        driverId: req.query.driverId as string | undefined,
        status: req.query.status as BatchStatus | undefined,
        slotId: req.query.slotId as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      });
      return res.json({ success: true, data: result.batches, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }

  async getBatchById(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await batchesService.getBatchById(req.params.id);
      return res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async createBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateDeliveryBatchSchema.parse(req.body);
      const batch = await batchesService.createBatch(validated, req.user!.id, req.user!.role);
      return res.status(201).json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async dispatchBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await batchesService.dispatchBatch(req.params.id, req.user!.id, req.user!.role);
      return res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }
}

export const batchesController = new BatchesController();
