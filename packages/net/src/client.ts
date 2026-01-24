/**
 * Client-side remote invocation utilities.
 * Provides timeout, retry, and error handling for RemoteFunction calls.
 */

import { ErrorCode, Result, ok, err, isRetryableError } from "@rbx/shared-types";
import { REMOTE_INVOKE_TIMEOUT_MS } from "@rbx/constants";

// ============================================================================
// Types
// ============================================================================

export interface InvokeOptions {
  /** Timeout in milliseconds (default: REMOTE_INVOKE_TIMEOUT_MS) */
  timeoutMs?: number;
}

export interface RetryOptions extends InvokeOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay between retries in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Whether to use exponential backoff (default: true) */
  exponentialBackoff?: boolean;
  /** Maximum delay between retries in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Only retry on these error codes. If empty, retry on all retryable errors. */
  retryOnCodes?: ErrorCode[];
}

// ============================================================================
// Timeout Utility
// ============================================================================

/**
 * Invoke a RemoteFunction with a timeout.
 * Returns a Timeout error if the call takes too long.
 *
 * @param remote - The RemoteFunction to invoke
 * @param payload - The payload to send
 * @param options - Timeout options
 */
export function invokeWithTimeout<TPayload, TResponse>(
  remote: RemoteFunction,
  payload: TPayload,
  options?: InvokeOptions
): Result<TResponse> {
  const timeoutMs = options?.timeoutMs ?? REMOTE_INVOKE_TIMEOUT_MS;
  const timeoutSeconds = timeoutMs / 1000;

  // Track whether we've received a response
  let completed = false;
  let result: Result<TResponse> | undefined;

  // Spawn the actual invoke
  const invokeThread = coroutine.create(() => {
    const [success, response] = pcall(() => remote.InvokeServer(payload));

    if (!completed) {
      completed = true;
      if (success) {
        // Assume server returns Result<T> format
        result = response as Result<TResponse>;
      } else {
        result = err(ErrorCode.InternalError, {
          message: `Remote invoke failed: ${response}`,
        });
      }
    }
  });

  coroutine.resume(invokeThread);

  // Wait for completion or timeout
  const startTime = os.clock();
  while (!completed && os.clock() - startTime < timeoutSeconds) {
    task.wait(0.1);
  }

  if (!completed) {
    completed = true;
    return err(ErrorCode.Timeout, {
      message: `Remote invoke timed out after ${timeoutMs}ms`,
      retryAfterMs: 1000,
    });
  }

  return result!;
}

// ============================================================================
// Retry Utility
// ============================================================================

/**
 * Invoke a RemoteFunction with automatic retry on failure.
 * Uses exponential backoff by default.
 *
 * @param remote - The RemoteFunction to invoke
 * @param payload - The payload to send
 * @param options - Retry options
 */
export function invokeWithRetry<TPayload, TResponse>(
  remote: RemoteFunction,
  payload: TPayload,
  options?: RetryOptions
): Result<TResponse> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const exponentialBackoff = options?.exponentialBackoff ?? true;
  const maxDelayMs = options?.maxDelayMs ?? 10000;
  const retryOnCodes = options?.retryOnCodes;

  let lastResult: Result<TResponse> | undefined;
  let attempt = 0;

  while (attempt <= maxRetries) {
    // Make the request
    lastResult = invokeWithTimeout<TPayload, TResponse>(remote, payload, options);

    // If successful, return immediately
    if (lastResult.ok) {
      return lastResult;
    }

    // Check if we should retry this error
    const shouldRetry = retryOnCodes
      ? retryOnCodes.includes(lastResult.code)
      : isRetryableError(lastResult.code);

    if (!shouldRetry || attempt >= maxRetries) {
      break;
    }

    // Calculate delay for next attempt
    let delayMs: number;
    if (lastResult.retryAfterMs !== undefined) {
      // Server specified retry delay
      delayMs = lastResult.retryAfterMs;
    } else if (exponentialBackoff) {
      // Exponential backoff: baseDelay * 2^attempt
      delayMs = math.min(baseDelayMs * math.pow(2, attempt), maxDelayMs);
    } else {
      delayMs = baseDelayMs;
    }

    // Add jitter (±10%) to prevent thundering herd
    const jitter = delayMs * 0.1 * (math.random() * 2 - 1);
    delayMs = math.max(100, delayMs + jitter);

    task.wait(delayMs / 1000);
    attempt++;
  }

  return lastResult!;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Fire and forget - invoke without waiting for response.
 * Use for non-critical events that don't need acknowledgment.
 */
export function fireRemote(remote: RemoteEvent, ...args: unknown[]): void {
  pcall(() => remote.FireServer(...args));
}

/**
 * Safe invoke that never throws, always returns Result.
 */
export function safeInvoke<TPayload, TResponse>(
  remote: RemoteFunction,
  payload: TPayload
): Result<TResponse> {
  const [success, response] = pcall(() => remote.InvokeServer(payload));

  if (success) {
    return response as Result<TResponse>;
  }

  return err(ErrorCode.InternalError, {
    message: `Remote invoke failed: ${response}`,
  });
}
