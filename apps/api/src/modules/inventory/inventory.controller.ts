import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';
import { InventoryAdjustmentSchema } from '@quickcommerce/shared';

export class InventoryController {
  async getStoreInventory(req: Request, res: Response, next: NextFunction) {
    try {
      const requestedStoreId = req.params.storeId || (req.query.storeId as string);
      const storeId = requestedStoreId || req.user?.storeId;

      if (req.user?.role !== 'GOD_ADMIN' && req.user?.role !== 'SUPER_ADMIN' && requestedStoreId && requestedStoreId !== req.user?.storeId) {
        return res.status(403).json({ success: false, message: 'Cannot access other store inventory' });
      }

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
      if (req.user?.role !== 'GOD_ADMIN' && req.user?.role !== 'SUPER_ADMIN' && validated.storeId !== req.user?.storeId) {
        return res.status(403).json({ success: false, message: 'Cannot access other store inventory' });
      }
      const result = await inventoryService.adjustInventory(validated, req.user!.id, req.user!.role);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
