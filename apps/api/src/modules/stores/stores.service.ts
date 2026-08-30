import { prisma, withTransactionRetry } from '../../database/prisma';
import { ErrorCodes, CreateStoreSchema, UpdateStoreSchema, StoreFilterSchema, AuditAction, UserRole } from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { z } from 'zod';

export class StoresService {
  async listStores(query: z.infer<typeof StoreFilterSchema>) {
    const { page, limit, search, isActive, city } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (city) where.city = { contains: city, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [stores, total] = await Promise.all([
      prisma.store.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: {
              storeProducts: true,
              drivers: true,
              orders: true,
            },
          },
        },
      }),
      prisma.store.count({ where }),
    ]);

    return {
      stores,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getStoreById(id: string) {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            storeProducts: true,
            drivers: true,
            staff: true,
            deliverySlots: true,
            orders: true,
          },
        },
      },
    });

    if (!store) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `Store with id ${id} not found`, 404);
    }

    return store;
  }

  async createStore(data: z.infer<typeof CreateStoreSchema>, actorId: string, actorRole: UserRole) {
    return await withTransactionRetry(async (tx) => {
      const existing = await tx.store.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, `Store code '${data.code}' already exists`, 409);
      }

      const store = await tx.store.create({
        data,
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          storeId: store.id,
          action: AuditAction.CREATE,
          entityType: 'Store',
          entityId: store.id,
          newValue: store as any,
        },
      });

      return store;
    });
  }

  async updateStore(id: string, data: z.infer<typeof UpdateStoreSchema>, actorId: string, actorRole: UserRole) {
    return await withTransactionRetry(async (tx) => {
      const current = await tx.store.findUnique({ where: { id } });
      if (!current) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `Store not found`, 404);
      }

      // Optimistic concurrency check if version passed
      if (data.version !== undefined && current.version !== data.version) {
        throw new AppError(
          ErrorCodes.CONCURRENT_MODIFICATION,
          'Store was modified concurrently by another user. Please refresh and retry.',
          409
        );
      }

      const { version, ...updateFields } = data;

      const updated = await tx.store.update({
        where: { id },
        data: {
          ...updateFields,
          version: { increment: 1 },
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          storeId: updated.id,
          action: AuditAction.UPDATE,
          entityType: 'Store',
          entityId: updated.id,
          oldValue: current as any,
          newValue: updated as any,
        },
      });

      return updated;
    });
  }
}

export const storesService = new StoresService();
