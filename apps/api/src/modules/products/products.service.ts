import { prisma, withTransactionRetry } from '../../database/prisma';
import { ErrorCodes, CreateProductSchema, UpdateProductSchema, ProductFilterSchema, AuditAction, UserRole } from '@quickcommerce/shared';
import { AppError } from '../../middleware/error-handler';
import { z } from 'zod';

export class ProductsService {
  async listCategories() {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    });
  }

  async listProducts(query: Partial<z.infer<typeof ProductFilterSchema>> = {}) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const { search, categoryId, storeId, brand, inStockOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (brand) where.brand = { contains: brand, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          category: true,
          storeProducts: storeId ? { where: { storeId } } : false,
          inventory: storeId ? { where: { storeId } } : false,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Map store-specific pricing and stock projections
    const mappedProducts = products.map((p) => {
      const sp = (p as any).storeProducts?.[0];
      const inv = (p as any).inventory?.[0];
      const availableQuantity = inv ? Math.max(0, inv.quantity - inv.reservedQuantity) : 0;
      const storePrice = sp ? Number(sp.price) : Number(p.basePrice);

      return {
        id: p.id,
        categoryId: p.categoryId,
        category: p.category,
        name: p.name,
        slug: p.slug,
        description: p.description,
        brand: p.brand,
        unit: p.unit,
        mrp: Number(p.mrp),
        basePrice: Number(p.basePrice),
        storePrice,
        isAvailableInStore: sp ? sp.isAvailable : true,
        availableQuantity,
        lowStockThreshold: inv?.lowStockThreshold ?? 5,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        version: p.version,
      };
    });

    const filtered = inStockOnly ? mappedProducts.filter((p) => p.availableQuantity > 0) : mappedProducts;

    return {
      products: filtered,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string, storeId?: string) {
    const p = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        storeProducts: storeId ? { where: { storeId } } : false,
        inventory: storeId ? { where: { storeId } } : false,
      },
    });

    if (!p) {
      throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Product not found', 404);
    }

    const sp = (p as any).storeProducts?.[0];
    const inv = (p as any).inventory?.[0];

    return {
      id: p.id,
      categoryId: p.categoryId,
      category: p.category,
      name: p.name,
      slug: p.slug,
      description: p.description,
      brand: p.brand,
      unit: p.unit,
      mrp: Number(p.mrp),
      basePrice: Number(p.basePrice),
      storePrice: sp ? Number(sp.price) : Number(p.basePrice),
      isAvailableInStore: sp ? sp.isAvailable : true,
      availableQuantity: inv ? Math.max(0, inv.quantity - inv.reservedQuantity) : 0,
      lowStockThreshold: inv?.lowStockThreshold ?? 5,
      imageUrl: p.imageUrl,
      isActive: p.isActive,
      version: p.version,
    };
  }

  async createProduct(data: z.infer<typeof CreateProductSchema>, actorId: string, actorRole: UserRole) {
    return await withTransactionRetry(async (tx) => {
      const existing = await tx.product.findUnique({ where: { slug: data.slug } });
      if (existing) {
        throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, `Product slug '${data.slug}' already exists`, 409);
      }

      const category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, `Category not found`, 404);
      }

      const product = await tx.product.create({
        data: {
          ...data,
          mrp: data.mrp,
          basePrice: data.basePrice,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CREATE,
          entityType: 'Product',
          entityId: product.id,
          newValue: product as any,
        },
      });

      return product;
    });
  }

  async updateProduct(id: string, data: z.infer<typeof UpdateProductSchema>, actorId: string, actorRole: UserRole) {
    return await withTransactionRetry(async (tx) => {
      const current = await tx.product.findUnique({ where: { id } });
      if (!current) {
        throw new AppError(ErrorCodes.RESOURCE_NOT_FOUND, 'Product not found', 404);
      }

      if (data.slug && data.slug !== current.slug) {
        const existing = await tx.product.findUnique({ where: { slug: data.slug } });
        if (existing) {
          throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, `Product slug '${data.slug}' already exists`, 409);
        }
      }

      if (data.version !== undefined && current.version !== data.version) {
        throw new AppError(ErrorCodes.CONCURRENT_MODIFICATION, 'Product modified concurrently', 409);
      }

      const { version, ...updateFields } = data;

      const updated = await tx.product.update({
        where: { id },
        data: {
          ...updateFields,
          mrp: updateFields.mrp !== undefined ? updateFields.mrp : undefined,
          basePrice: updateFields.basePrice !== undefined ? updateFields.basePrice : undefined,
          version: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.UPDATE,
          entityType: 'Product',
          entityId: updated.id,
          oldValue: current as any,
          newValue: updated as any,
        },
      });

      return updated;
    });
  }
}

export const productsService = new ProductsService();
