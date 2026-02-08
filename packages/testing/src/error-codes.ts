/**
 * Error codes for Node.js/Vitest tests.
 * Re-exports from shared-types for consistency.
 *
 * Note: We maintain a separate copy here because @rbx/shared-types
 * uses roblox-ts compilation which may not be directly importable in Node.
 * These MUST stay in sync with @rbx/shared-types/src/error-codes.ts
 */

/**
 * Stable error codes for remote responses.
 * Never change existing codes; only add new ones.
 *
 * Code ranges:
 * - 0: Unknown
 * - 1xxx: Payload validation errors
 * - 2xxx: State/business logic errors
 * - 3xxx: Protocol compatibility errors
 * - 4xxx: Authentication/authorization errors
 * - 5xxx: Server/infrastructure errors
 */
export enum ErrorCode {
  // Unknown
  Unknown = 0,

  // 1xxx: Payload validation
  InvalidPayload = 1001,
  PayloadTooLarge = 1002,
  MissingField = 1003,
  InvalidType = 1004,
  OutOfBounds = 1005,

  // 2xxx: State/business logic
  RateLimited = 2001,
  Cooldown = 2002,
  InvalidState = 2003,
  NotFound = 2004,
  AlreadyExists = 2005,
  InsufficientResources = 2006,
  FeatureDisabled = 2007,

  // 3xxx: Protocol compatibility
  ProtocolMismatch = 3001,
  ClientOutdated = 3002,
  ServerOutdated = 3003,

  // 4xxx: Auth errors
  Unauthorized = 4001,
  Forbidden = 4002,
  SessionExpired = 4003,

  // 5xxx: Server errors
  InternalError = 5001,
  ServiceUnavailable = 5002,
  Timeout = 5003,
  DataStoreFailed = 5004,
}

/**
 * Protocol version - must match @rbx/shared-types
 */
export const PROTOCOL_VERSION = 1;

/**
 * Minimum supported protocol version.
 */
export const MIN_PROTOCOL_VERSION = 1;

/**
 * Get a human-readable description for an error code.
 */
export function getErrorCodeDescription(code: ErrorCode): string {
  switch (code) {
    case ErrorCode.Unknown:
      return "An unknown error occurred";
    case ErrorCode.InvalidPayload:
      return "The request payload is invalid";
    case ErrorCode.PayloadTooLarge:
      return "The request payload exceeds size limits";
    case ErrorCode.MissingField:
      return "A required field is missing";
    case ErrorCode.InvalidType:
      return "A field has an invalid type";
    case ErrorCode.OutOfBounds:
      return "A value is outside acceptable bounds";
    case ErrorCode.RateLimited:
      return "Too many requests, please slow down";
    case ErrorCode.Cooldown:
      return "Action is on cooldown";
    case ErrorCode.InvalidState:
      return "Invalid state for this operation";
    case ErrorCode.NotFound:
      return "The requested resource was not found";
    case ErrorCode.AlreadyExists:
      return "The resource already exists";
    case ErrorCode.InsufficientResources:
      return "Insufficient resources for this operation";
    case ErrorCode.FeatureDisabled:
      return "This feature is currently disabled";
    case ErrorCode.ProtocolMismatch:
      return "Protocol version mismatch";
    case ErrorCode.ClientOutdated:
      return "Client version is outdated, please update";
    case ErrorCode.ServerOutdated:
      return "Server version is outdated";
    case ErrorCode.Unauthorized:
      return "Authentication required";
    case ErrorCode.Forbidden:
      return "You don't have permission for this action";
    case ErrorCode.SessionExpired:
      return "Your session has expired";
    case ErrorCode.InternalError:
      return "An internal server error occurred";
    case ErrorCode.ServiceUnavailable:
      return "Service temporarily unavailable";
    case ErrorCode.Timeout:
      return "The operation timed out";
    case ErrorCode.DataStoreFailed:
      return "Data store operation failed";
    default:
      return "An error occurred";
  }
}

/**
 * Check if an error code is retryable.
 */
export function isRetryableError(code: ErrorCode): boolean {
  switch (code) {
    case ErrorCode.RateLimited:
    case ErrorCode.Cooldown:
    case ErrorCode.ServiceUnavailable:
    case ErrorCode.Timeout:
    case ErrorCode.DataStoreFailed:
      return true;
    default:
      return false;
  }
}

/**
 * Check if an error code indicates a client-side issue.
 */
export function isClientError(code: ErrorCode): boolean {
  return code >= 1000 && code < 5000;
}

/**
 * Check if an error code indicates a server-side issue.
 */
export function isServerError(code: ErrorCode): boolean {
  return code >= 5000;
}
