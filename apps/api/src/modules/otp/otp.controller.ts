import { Request, Response, NextFunction } from 'express';
import { otpService } from './otp.service';
import { VerifyOTPSchema } from '@quickcommerce/shared';

export class OTPController {
  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = VerifyOTPSchema.parse(req.body);
      const result = await otpService.verifyDeliveryOtp(req.user!.id, validated);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const otpController = new OTPController();
