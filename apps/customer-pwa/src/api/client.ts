import { ApiResponse } from '@quickcommerce/shared';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit & { idempotencyKey?: string } = {}
): Promise<T> {
  const token = localStorage.getItem('qc_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.idempotencyKey) {
    headers['Idempotency-Key'] = options.idempotencyKey;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with QuickCommerce API',
    },
  }));

  if (!json.success) {
    throw new ApiError(json.error.code, json.error.message, json.error.details);
  }

  return json.data;
}

export async function searchProductsApi(params: {
  q: string;
  storeId?: string;
  categoryId?: string;
  inStockOnly?: boolean;
  limit?: number;
}) {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.storeId) query.set('storeId', params.storeId);
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.inStockOnly) query.set('inStockOnly', 'true');
  if (params.limit) query.set('limit', String(params.limit));

  return apiRequest<any[]>(`/products/search?${query.toString()}`);
}

export async function getSearchSuggestionsApi(q: string, storeId?: string) {
  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (storeId) query.set('storeId', storeId);

  return apiRequest<{
    suggestions: string[];
    intentPills: { label: string; query: string }[];
    categories: any[];
  }>(`/products/search/suggestions?${query.toString()}`);
}
