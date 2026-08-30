import { Request, Response, NextFunction } from 'express';
import { slotsService } from './slots.service';
import { DeliverySlotFilterSchema, UpdateSlotCapacitySchema } from '@quickcommerce/shared';

export class SlotsController {
  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const query = DeliverySlotFilterSchema.parse({
        storeId: req.query.storeId,
        date: req.query.date,
      });
      const slots = await slotsService.getOrGenerateSlotsForDate(query.storeId, query.date);
      return res.json({ success: true, data: slots });
    } catch (err) {
      next(err);
    }
  }

  async updateSlotConfig(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = UpdateSlotCapacitySchema.parse(req.body);
      const slot = await slotsService.updateSlotConfig(req.params.id, validated, req.user!.id, req.user!.role);
      return res.json({ success: true, data: slot });
    } catch (err) {
      next(err);
    }
  }
}

export const slotsController = new SlotsController();
