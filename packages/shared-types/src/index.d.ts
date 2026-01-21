/**
 * @rbx/shared-types
 * Core type definitions shared across the platform.
 * This package has NO dependencies and must remain pure.
 * Compatible with roblox-ts (noLib: true).
 */
/**
 * Brand a primitive type for type-safe IDs.
 * Example: PlayerId is a number that can't be accidentally used as a MatchId.
 */
export type Brand<T, TBrand extends string> = T & {
    readonly __brand: TBrand;
};
/** Unique player identifier (Roblox UserId) */
export type PlayerId = Brand<number, "PlayerId">;
/** Unique match/game session identifier */
export type MatchId = Brand<string, "MatchId">;
/** Unique request identifier for idempotency */
export type RequestId = Brand<string, "RequestId">;
/** Server/job identifier */
export type ServerId = Brand<string, "ServerId">;
/** Session identifier */
export type SessionId = Brand<string, "SessionId">;
export declare const createPlayerId: (id: number) => PlayerId;
export declare const createMatchId: (id: string) => MatchId;
export declare const createRequestId: (id: string) => RequestId;
export declare const createServerId: (id: string) => ServerId;
export declare const createSessionId: (id: string) => SessionId;
/**
 * Protocol version for client-server compatibility.
 * Increment on breaking changes (see ADR-0002).
 */
export declare const PROTOCOL_VERSION = 1;
/**
 * Stable error codes for remote responses.
 * Never change existing codes; only add new ones.
 */
export declare enum ErrorCode {
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
    Timeout = 5003
}
export interface Ok<T> {
    readonly ok: true;
    readonly value: T;
}
export interface Err {
    readonly ok: false;
    readonly code: ErrorCode;
    readonly message?: string;
    readonly retryAfterMs?: number;
    readonly field?: string;
}
export type Result<T> = Ok<T> | Err;
export declare const ok: <T>(value: T) => Ok<T>;
export declare const err: (code: ErrorCode, options?: Omit<Err, "ok" | "code">) => Err;
export declare function isOk<T>(result: Result<T>): result is Ok<T>;
export declare function isErr<T>(result: Result<T>): result is Err;
export declare function unwrap<T>(result: Result<T>): T;
export declare function unwrapOr<T>(result: Result<T>, defaultValue: T): T;
export declare function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U>;
export declare function flatMapResult<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U>;
export type DeviceClass = "kbm" | "gamepad" | "touch";
export interface BaseRequest {
    requestId?: string;
}
export interface BaseResponse {
    ok: boolean;
    code?: ErrorCode;
    retryAfterMs?: number;
}
export interface Vector3DTO {
    x: number;
    y: number;
    z: number;
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type ResultValue<R> = R extends Result<infer T> ? T : never;
