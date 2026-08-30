import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { InventoryAdjustmentSchema } from '@quickcommerce/shared';

export class InventoryController {
  async getStoreInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.params.storeId || (req.query.storeId as string) || req.user?.storeId;
      const search = req.query.search as string | undefined;
      const lowStockOnly = req.query.lowStock === 'true';

      const items = await inventoryService.getStoreInventory(storeId, search, lowStockOnly);
      return res.json({ success: true, data: items });
    } catch (err) {
      next(err);
    }
  }

  async getMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const movements = await inventoryService.getInventoryMovements(req.params.inventoryId);
      return res.json({ success: true, data: movements });
    } catch (err) {
      next(err);
    }
  }

  async adjustInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = InventoryAdjustmentSchema.parse(req.body);
      const result = await inventoryService.adjustInventory(validated, req.user!.id, req.user!.role);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
