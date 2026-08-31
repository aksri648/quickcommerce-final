import { Request, Response, NextFunction } from 'express';
import { driversService } from './drivers.service';
import { AssignDriverSchema, DriverStatusUpdateSchema, CreateDriverSchema, DriverStatus } from '@quickcommerce/shared';

export class DriversController {
  async listDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.user?.role === UserRole.SUPER_ADMIN ? (req.query.storeId as string) : req.user?.storeId;
      const status = req.query.status as DriverStatus | undefined;
      const availableOnly = req.query.availableOnly === 'true';

      const drivers = await driversService.listDrivers(storeId, status, availableOnly);
      return res.json({ success: true, data: drivers });
    } catch (err) {
      next(err);
    }
  }

  async getMyDriverProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await driversService.getDriverByUserId(req.user!.id);
      return res.json({ success: true, data: driver });
    } catch (err) {
      next(err);
    }
  }

  async getDriverById(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await driversService.getDriverById(req.params.id);
      return res.json({ success: true, data: driver });
    } catch (err) {
      next(err);
    }
  }

  async assignDriverToBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = AssignDriverSchema.parse(req.body);
      const batch = await driversService.assignDriverToBatch(
        req.params.batchId,
        validated.driverId,
        req.user!.id,
        req.user!.role,
        validated.expectedVersion,
        req.user!.storeId
      );
      return res.json({ success: true, data: batch });
    } catch (err) {
      next(err);
    }
  }

  async updateDriverStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = DriverStatusUpdateSchema.parse(req.body);
      const driver = await driversService.updateDriverStatus(req.user!.id, validated);
      return res.json({ success: true, data: driver });
    } catch (err) {
      next(err);
    }
  }

  async createDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateDriverSchema.parse(req.body);
      const driver = await driversService.createDriver(validated, req.user!.id, req.user!.role);
      return res.status(201).json({ success: true, data: driver });
    } catch (err) {
      next(err);
    }
  }
}

export const driversController = new DriversController();
