/**
 * RPC Request/Response Types
 */

export interface RPCRequestContext {
  correlationId?: string;
  clientVersion?: string;
}

export interface RPCRequest<T = unknown> {
  procedure: string;
  input: T;
  context?: RPCRequestContext;
}

export interface RPCResponseMetadata {
  timestamp: number;
  requestId: string;
}

export interface RPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: RPCError;
  metadata: RPCResponseMetadata;
}

export interface RPCError {
  code: number;
  message: string;
  details?: unknown;
  stack?: string; // Only included in development
}

// Error codes: 1000-1999 (per SDD specification)
export enum ErrorCode {
  // Authentication errors: 1000-1099
  UNAUTHORIZED = 1000,
  INVALID_CREDENTIALS = 1001,
  SESSION_EXPIRED = 1002,
  INVALID_TOKEN = 1003,
  EMAIL_NOT_VERIFIED = 1004,
  ACCOUNT_DISABLED = 1005,

  // Authorization errors: 1100-1199
  FORBIDDEN = 1100,
  INSUFFICIENT_PERMISSIONS = 1101,
  ACCESS_DENIED = 1102,

  // Validation errors: 1200-1299
  VALIDATION_ERROR = 1200,
  INVALID_INPUT = 1201,
  MISSING_REQUIRED_FIELD = 1202,
  INVALID_FORMAT = 1203,
  INVALID_EMAIL = 1204,
  INVALID_PASSWORD = 1205,
  INVALID_USERNAME = 1206,

  // Resource errors: 1300-1399
  NOT_FOUND = 1300,
  RESOURCE_NOT_FOUND = 1301,
  USER_NOT_FOUND = 1302,
  POST_NOT_FOUND = 1303,
  FEED_NOT_FOUND = 1304,
  CONVERSATION_NOT_FOUND = 1305,
  MESSAGE_NOT_FOUND = 1306,

  // Conflict errors: 1400-1499
  CONFLICT = 1400,
  ALREADY_EXISTS = 1401,
  DUPLICATE_USERNAME = 1402,
  DUPLICATE_EMAIL = 1403,
  ALREADY_FOLLOWING = 1404,
  ALREADY_FRIENDS = 1405,

  // Rate limiting errors: 1500-1599
  RATE_LIMIT_EXCEEDED = 1500,
  TOO_MANY_REQUESTS = 1501,
  QUOTA_EXCEEDED = 1502,

  // Storage errors: 1600-1699
  STORAGE_LIMIT_EXCEEDED = 1600,
  INVALID_FILE_TYPE = 1601,
  FILE_TOO_LARGE = 1602,
  STORAGE_QUOTA_EXCEEDED = 1603,

  // Server errors: 1900-1999
  INTERNAL_SERVER_ERROR = 1900,
  DATABASE_ERROR = 1901,
  EXTERNAL_SERVICE_ERROR = 1902,
  SERVICE_UNAVAILABLE = 1903,

  // Unknown errors
  UNKNOWN_ERROR = 9999,
}
