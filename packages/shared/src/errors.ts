export const ErrorCodes = {
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  SLOT_FULL: 'SLOT_FULL',
  SLOT_CLOSED: 'SLOT_CLOSED',
  SLOT_NOT_BOOKABLE: 'SLOT_NOT_BOOKABLE',
  STORE_INACTIVE: 'STORE_INACTIVE',
  DRIVER_UNAVAILABLE: 'DRIVER_UNAVAILABLE',
  DRIVER_CONFLICT: 'DRIVER_CONFLICT',
  BATCH_INVALID: 'BATCH_INVALID',
  INVALID_ORDER_STATE: 'INVALID_ORDER_STATE',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_ALREADY_USED: 'OTP_ALREADY_USED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
    cursor?: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
