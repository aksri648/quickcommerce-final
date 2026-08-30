import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestTracker } from './middleware/request-tracker';
import { standardRateLimiter } from './middleware/rate-limiter';
import { errorHandler } from './middleware/error-handler';
import { config } from './config';

// Module Routes
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { storesRoutes } from './modules/stores/stores.routes';
import { productsRoutes } from './modules/products/products.routes';
import { inventoryRoutes } from './modules/inventory/inventory.routes';
import { slotsRoutes } from './modules/slots/slots.routes';
import { cartRoutes } from './modules/cart/cart.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { batchesRoutes } from './modules/batches/batches.routes';
import { driversRoutes } from './modules/drivers/drivers.routes';
import { otpRoutes } from './modules/otp/otp.routes';
import { invoicesRoutes } from './modules/invoices/invoices.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { auditRoutes } from './modules/audit/audit.routes';
import { notificationsRoutes } from './modules/notifications/notifications.routes';
import { docsRoutes } from './docs/swagger';

export function createApp() {
  const app = express();

  // Security headers & CORS
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(','),
      credentials: true,
    })
  );

  // Body parser & request tracking
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(requestTracker);
  app.use(standardRateLimiter);

  // Mount API Endpoints
  app.use('/health', healthRoutes);
  app.use('/docs', docsRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/stores', storesRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/slots', slotsRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/batches', batchesRoutes);
  app.use('/api/drivers', driversRoutes);
  app.use('/api/otp', otpRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
