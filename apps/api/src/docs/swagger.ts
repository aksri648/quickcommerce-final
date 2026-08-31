import swaggerUi from 'swagger-ui-express';
import { Router } from 'express';

const router = Router();

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'QuickCommerce Platform API',
    version: '1.0.0',
    description:
      'Production Multi-Store Scheduled E-Commerce & Rapid Grocery Delivery Modular Monolith API.\n' +
      'Supports 4 role-based PWAs: Customer, Driver Partner, Store Admin, and Platform God Admin.',
    contact: {
      name: 'QuickCommerce Engineering',
      email: 'engineering@quickcommerce.internal',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Base URL',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Pass standard JWT token obtained from `/auth/dev-login` or Auth0 SSO',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Detailed error message' },
              details: { type: 'object' },
            },
          },
        },
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
        },
      },
    },
  },
  tags: [
    { name: 'Health', description: 'System health, liveness, and readiness probes' },
    { name: 'Auth', description: 'Authentication, simulated dev-login, and profile inspection' },
    { name: 'Stores', description: 'Dark store management and geolocation matching' },
    { name: 'Products & Search', description: 'Catalog browsing, instant search, and taxonomy' },
    { name: 'Inventory', description: 'Real-time multi-store stock level tracking and adjustments' },
    { name: 'Delivery Slots', description: '3-hour scheduled window capacities and cutoffs' },
    { name: 'Cart', description: 'Store-bound persistent shopping cart' },
    { name: 'Orders', description: 'Transactional checkout, state transitions, and tracking' },
    { name: 'Delivery Batches', description: 'Automated clustering, route sequencing, and dispatch' },
    { name: 'Drivers', description: 'Delivery partner statuses and active batch fulfillment' },
    { name: 'Doorstep OTP', description: 'Cryptographic SHA-256 OTP issuance and verification' },
    { name: 'Invoices', description: 'Immutable financial invoices and tax calculation' },
    { name: 'Analytics', description: 'Real-time store metrics and executive dashboards' },
    { name: 'Audit', description: 'Tamper-evident audit log ledger' },
    { name: 'Notifications', description: 'In-app and push notification management' },
  ],
  paths: {
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Readiness probe checking database & Redis latency',
        responses: {
          '200': { description: 'All core dependencies healthy' },
          '503': { description: 'One or more dependencies unreachable' },
        },
      },
    },
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Process liveness probe',
        responses: {
          '200': { description: 'Service process running' },
        },
      },
    },
    '/auth/dev-login': {
      post: {
        tags: ['Auth'],
        summary: 'Dev / Testing login for any role',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['CUSTOMER', 'DRIVER', 'STORE_STAFF', 'STORE_ADMIN', 'SUPER_ADMIN'],
                    example: 'CUSTOMER',
                  },
                  email: { type: 'string', example: 'customer@example.com' },
                  name: { type: 'string', example: 'Demo User' },
                },
                required: ['role'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'JWT authentication token generated with user payload' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Retrieve authenticated user profile and roles',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Authenticated user profile' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/stores': {
      get: {
        tags: ['Stores'],
        summary: 'List active dark stores and operational hours',
        responses: {
          '200': { description: 'List of stores' },
        },
      },
      post: {
        tags: ['Stores'],
        summary: 'Create a new dark store (Super Admin only)',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Store created successfully' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products & Search'],
        summary: 'List catalog products with pagination and category filtering',
        parameters: [
          { name: 'storeId', in: 'query', schema: { type: 'string' } },
          { name: 'categoryId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Product list with inventory availability' },
        },
      },
    },
    '/products/search': {
      get: {
        tags: ['Products & Search'],
        summary: 'Fast full-text search with typo tolerance and store pricing',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'storeId', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Search results matching query' },
        },
      },
    },
    '/inventory/store/{storeId}': {
      get: {
        tags: ['Inventory'],
        summary: 'Get store stock levels and low-stock alerts',
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Store inventory list' },
        },
      },
    },
    '/slots/store/{storeId}': {
      get: {
        tags: ['Delivery Slots'],
        summary: 'Get available 3-hour delivery windows for a store',
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Delivery slots with capacity and cutoff status' },
        },
      },
    },
    '/cart': {
      get: {
        tags: ['Cart'],
        summary: 'Get current customer cart with authoritative price breakdown',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Cart content and calculations' },
        },
      },
    },
    '/cart/items': {
      post: {
        tags: ['Cart'],
        summary: 'Add item to cart or update quantity',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  storeId: { type: 'string' },
                  productId: { type: 'string' },
                  quantity: { type: 'number', minimum: 1 },
                },
                required: ['storeId', 'productId', 'quantity'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Cart updated' },
        },
      },
    },
    '/orders/checkout': {
      post: {
        tags: ['Orders'],
        summary: 'Transactional order placement with slot booking & inventory reservation',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Unique UUID to guarantee idempotent order creation',
          },
        ],
        responses: {
          '201': { description: 'Order created with status PLACED and OTP generated' },
          '409': { description: 'Slot capacity full or stock conflict' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders'],
        summary: 'List customer or store orders',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Order listing' },
        },
      },
    },
    '/batches': {
      get: {
        tags: ['Delivery Batches'],
        summary: 'List delivery batches by store and slot',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Delivery batches' },
        },
      },
    },
    '/drivers/my-batch': {
      get: {
        tags: ['Drivers'],
        summary: 'Get assigned delivery batch for authenticated driver',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Assigned batch with sequenced stops' },
        },
      },
    },
    '/otp/verify': {
      post: {
        tags: ['Doorstep OTP'],
        summary: 'Verify customer OTP upon doorstep delivery',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  orderId: { type: 'string' },
                  otp: { type: 'string', example: '1234' },
                },
                required: ['orderId', 'otp'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'OTP verified and order marked DELIVERED' },
          '400': { description: 'Invalid or expired OTP' },
        },
      },
    },
    '/analytics/store/{storeId}/realtime': {
      get: {
        tags: ['Analytics'],
        summary: 'Store-level real-time throughput and SLA metrics',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'storeId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': { description: 'Real-time metrics' },
        },
      },
    },
    '/audit/logs': {
      get: {
        tags: ['Audit'],
        summary: 'Query immutable audit logs (Admin only)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Audit log entries' },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for current user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Notifications list' },
        },
      },
    },
  },
};

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export const docsRoutes = router;
