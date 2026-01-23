/**
 * Error codes that mirror @rbx/shared-types ErrorCode enum.
 * These MUST stay in sync with the actual values.
 *
 * @see packages/shared-types/src/index.ts
 */
export enum ErrorCode {
  Unknown = 0,
  InvalidPayload = 1001,
  PayloadTooLarge = 1002,
  MissingField = 1003,
  InvalidType = 1004,
  OutOfBounds = 1005,
  RateLimited = 2001,
  Cooldown = 2002,
  InvalidState = 2003,
  NotFound = 2004,
  AlreadyExists = 2005,
  InsufficientResources = 2006,
  FeatureDisabled = 2007,
  ProtocolMismatch = 3001,
  ClientOutdated = 3002,
  ServerOutdated = 3003,
  Unauthorized = 4001,
  Forbidden = 4002,
  SessionExpired = 4003,
  InternalError = 5001,
  ServiceUnavailable = 5002,
  Timeout = 5003,
}

/**
 * Protocol version - must match @rbx/shared-types
 */
export const PROTOCOL_VERSION = 1;
