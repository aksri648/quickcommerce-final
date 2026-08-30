import { Request, Response, NextFunction } from 'express';
import { storesService } from './stores.service';
import { CreateStoreSchema, UpdateStoreSchema, StoreFilterSchema } from '@quickcommerce/shared';

export class StoresController {
  async listStores(req: Request, res: Response, next: NextFunction) {
    try {
      const query = StoreFilterSchema.parse(req.query);
      const result = await storesService.listStores(query);
      return res.json({ success: true, data: result.stores, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }

  async getStoreById(req: Request, res: Response, next: NextFunction) {
    try {
      const store = await storesService.getStoreById(req.params.id);
      return res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }

  async createStore(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateStoreSchema.parse(req.body);
      const store = await storesService.createStore(validated, req.user!.id, req.user!.role);
      return res.status(201).json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }

  async updateStore(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = UpdateStoreSchema.parse(req.body);
      const store = await storesService.updateStore(req.params.id, validated, req.user!.id, req.user!.role);
      return res.json({ success: true, data: store });
    } catch (err) {
      next(err);
    }
  }
}

export const storesController = new StoresController();
