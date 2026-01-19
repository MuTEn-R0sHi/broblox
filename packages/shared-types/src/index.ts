export type Brand<T, TBrand extends string> = T & { readonly __brand: TBrand };

export type PlayerId = Brand<string, "PlayerId">;

export enum ErrorCode {
  Unknown = "UNKNOWN",
  InvalidPayload = "INVALID_PAYLOAD",
  RateLimited = "RATE_LIMITED",
  Unauthorized = "UNAUTHORIZED"
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; code: ErrorCode; message?: string };
