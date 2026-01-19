import { ErrorCode, type Result } from "@rbx/shared-types";

export interface Logger {
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
}

export const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {}
};

export function safeExecute<T>(fn: () => T, onError: (error: unknown) => void): Result<T> {
  try {
    return { ok: true, value: fn() };
  } catch (error) {
    onError(error);
    return { ok: false, code: ErrorCode.Unknown };
  }
}
