import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { DevLoginSchema } from '@quickcommerce/shared';

export class AuthController {
  async devLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = DevLoginSchema.parse(req.body);
      const result = await authService.devLogin(validated.role, validated.email, validated.storeId);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await authService.getProfile(req.user!.id);
      return res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
