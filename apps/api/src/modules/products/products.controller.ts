import { Request, Response, NextFunction } from 'express';
import { productsService } from './products.service';
import { searchService } from './search.service';
import { ProductFilterSchema, CreateProductSchema, UpdateProductSchema } from '@quickcommerce/shared';

export class ProductsController {
  async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await productsService.listCategories();
      return res.json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ProductFilterSchema.parse(req.query);
      const result = await productsService.listProducts(query);
      return res.json({ success: true, data: result.products, meta: result.meta });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Hybrid & Semantic Search Endpoint (Orama Engine)
   */
  async searchProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || (req.query.query as string) || '';
      const storeId = req.query.storeId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const inStockOnly = req.query.inStockOnly === 'true';
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await searchService.searchProducts({
        query: q,
        storeId,
        categoryId,
        inStockOnly,
        limit,
      });

      return res.json({
        success: true,
        data: result.products,
        meta: {
          total: result.total,
          query: result.query,
          mode: result.mode,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fast auto-complete suggestions & search discovery pills
   */
  async getSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const q = (req.query.q as string) || '';
      const storeId = req.query.storeId as string | undefined;
      const result = await searchService.getSuggestions(q, storeId);
      return res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const storeId = req.query.storeId as string | undefined;
      const product = await productsService.getProductById(req.params.id, storeId);
      return res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = CreateProductSchema.parse(req.body);
      const product = await productsService.createProduct(validated, req.user!.id, req.user!.role);
      // Update search index
      await searchService.indexProduct(product.id).catch(() => {});
      return res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = UpdateProductSchema.parse(req.body);
      const product = await productsService.updateProduct(req.params.id, validated, req.user!.id, req.user!.role);
      // Update search index
      await searchService.indexProduct(product.id).catch(() => {});
      return res.json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  }
}

export const productsController = new ProductsController();
