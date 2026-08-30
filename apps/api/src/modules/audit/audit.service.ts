import { prisma } from '../../database/prisma';

export class AuditService {
  async listLogs(params: {
    storeId?: string;
    entityType?: string;
    actorId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.storeId) where.storeId = params.storeId;
    if (params.entityType) where.entityType = params.entityType;
    if (params.actorId) where.actorId = params.actorId;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, name: true, email: true, role: true } },
          store: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditService = new AuditService();
