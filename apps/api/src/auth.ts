import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './database/prisma';
import { config } from './config';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'CUSTOMER',
        required: false,
      },
      storeId: {
        type: 'string',
        required: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
      isActive: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
    },
  },
  trustedOrigins: config.CORS_ORIGIN === '*' ? ['*'] : config.CORS_ORIGIN.split(','),
});

export type Auth = typeof auth;
