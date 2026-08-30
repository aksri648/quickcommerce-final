import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const router = Router();

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'QuickCommerce Platform API',
    version: '1.0.0',
    description: 'Production Multi-Store Scheduled E-Commerce / Quick-Commerce Modular Monolith API',
  },
  servers: [
    {
      url: '/api',
      description: 'Default API Endpoint',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health/ready': {
      get: {
        summary: 'Readiness probe checking database & redis',
        responses: {
          '200': { description: 'All core dependencies healthy' },
        },
      },
    },
    '/auth/dev-login': {
      post: {
        summary: 'Simulated login for testing & client demos across roles',
        responses: {
          '200': { description: 'JWT authentication token generated' },
        },
      },
    },
    '/orders/checkout': {
      post: {
        summary: 'Transactional order placement with slot & inventory reservation',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Order created with OTP and status PLACED' },
          '409': { description: 'Slot full or out of stock conflict' },
        },
      },
    },
  },
};

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export const docsRoutes = router;
