/**
 * RPC Request/Response Types
 */

export interface RPCRequest<T = unknown> {
  procedure: string;
  input: T;
}

export interface RPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: RPCError;
}

export interface RPCError {
  code: number;
  message: string;
  details?: unknown;
}

// Error codes: 1000-1999
export enum ErrorCode {
  // Auth errors: 1000-1099
  UNAUTHORIZED = 1000,
  INVALID_CREDENTIALS = 1001,
  EMAIL_NOT_VERIFIED = 1002,
  TOKEN_EXPIRED = 1003,

  // Validation errors: 1100-1199
  VALIDATION_ERROR = 1100,
  INVALID_INPUT = 1101,

  // Resource errors: 1200-1299
  NOT_FOUND = 1200,
  ALREADY_EXISTS = 1201,

  // Permission errors: 1300-1399
  FORBIDDEN = 1300,
  INSUFFICIENT_PERMISSIONS = 1301,

  // Storage errors: 1400-1499
  STORAGE_QUOTA_EXCEEDED = 1400,
  FILE_TOO_LARGE = 1401,
  INVALID_FILE_TYPE = 1402,

  // Server errors: 1500-1599
  INTERNAL_ERROR = 1500,
  DATABASE_ERROR = 1501,
  EXTERNAL_SERVICE_ERROR = 1502,
}
