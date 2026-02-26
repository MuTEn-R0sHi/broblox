/**
 * @broblox/testing
 * Shared test utilities, mocks, and helpers for vitest.
 * This package mirrors Roblox runtime types for Node.js testing.
 *
 * ⚠️  SYNC WARNING: error-codes.ts and result.ts are intentional copies
 * of @broblox/shared-types originals (needed because roblox-ts output can't
 * run in Node.js). If you change ErrorCode values or Result API in
 * @broblox/shared-types, you MUST update the copies here to match.
 */

export * from "./error-codes";
export * from "./result";
export * from "./roblox-mocks";
export * from "./factories";
