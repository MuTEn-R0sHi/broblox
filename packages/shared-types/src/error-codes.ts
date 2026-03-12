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
  // 0: Unknown
  Unknown = 0, // An unknown error occurred

  // 1xxx: Payload validation
  InvalidPayload = 1001, // The request payload is invalid
  PayloadTooLarge = 1002, // The request payload exceeds size limits
  MissingField = 1003, // A required field is missing
  InvalidType = 1004, // A field has an invalid type
  OutOfBounds = 1005, // A value is outside acceptable bounds

  // 2xxx: State/business logic
  RateLimited = 2001, // Too many requests, please slow down
  Cooldown = 2002, // Action is on cooldown
  InvalidState = 2003, // Invalid state for this operation
  NotFound = 2004, // The requested resource was not found
  AlreadyExists = 2005, // The resource already exists
  InsufficientResources = 2006, // Insufficient resources for this operation
  FeatureDisabled = 2007, // This feature is currently disabled

  // 3xxx: Protocol compatibility
  ProtocolMismatch = 3001, // Client and server protocol versions are incompatible
  ClientOutdated = 3002, // Client version is too old
  ServerOutdated = 3003, // Server version is too old

  // 4xxx: Auth errors
  Unauthorized = 4001, // Authentication required
  Forbidden = 4002, // Insufficient permissions
  SessionExpired = 4003, // Session has expired, rejoin required

  // 5xxx: Server errors
  InternalError = 5001, // An internal server error occurred
  ServiceUnavailable = 5002, // The service is temporarily unavailable
  Timeout = 5003, // The operation timed out
  DataStoreFailed = 5004, // DataStore operation failed
}

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
      return "Client and server protocol versions are incompatible";
    case ErrorCode.ClientOutdated:
      return "Client version is too old";
    case ErrorCode.ServerOutdated:
      return "Server version is too old";
    case ErrorCode.Unauthorized:
      return "Authentication required";
    case ErrorCode.Forbidden:
      return "Insufficient permissions";
    case ErrorCode.SessionExpired:
      return "Session has expired, rejoin required";
    case ErrorCode.InternalError:
      return "An internal server error occurred";
    case ErrorCode.ServiceUnavailable:
      return "The service is temporarily unavailable";
    case ErrorCode.Timeout:
      return "The operation timed out";
    case ErrorCode.DataStoreFailed:
      return "DataStore operation failed";
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
