/**
 * Action Request Validation
 *
 * Pure, side-effect-free validation logic for action requests.
 * No Roblox imports — safe to unit-test in Node.js without mocks.
 */

// ============================================================================
// Types
// ============================================================================

export interface ActionValidationInput {
  actionId: string;
  timestamp: number;
}

export interface ActionValidationDeps {
  /** Current server time in milliseconds. */
  nowMs: number;
  /** Max window (ms) by which a client timestamp may exceed server time. */
  timestampToleranceMs: number;
  /** Whether the action feature is enabled (from feature flags). */
  isActionEnabled: boolean;
}

export type ActionValidationOutcome =
  | { ok: true }
  | { ok: false; reason: "feature_disabled" | "invalid_timestamp" };

// ============================================================================
// Validator
// ============================================================================

/**
 * Validate an action request independently of the Roblox runtime.
 *
 * @returns `{ ok: true }` if the request is valid.
 * @returns `{ ok: false, reason }` with a stable reason code on failure.
 *
 * @example
 * ```ts
 * const result = validateActionRequest(request, {
 *   nowMs: os.clock() * 1000,
 *   timestampToleranceMs: TIMESTAMP_TOLERANCE_MS,
 *   isActionEnabled: isFlagEnabled("doAction.enabled"),
 * });
 * if (!result.ok) { ... }
 * ```
 */
export function validateActionRequest(
  request: ActionValidationInput,
  deps: ActionValidationDeps
): ActionValidationOutcome {
  if (!deps.isActionEnabled) {
    return { ok: false, reason: "feature_disabled" };
  }

  if (request.timestamp < 0 || request.timestamp > deps.nowMs + deps.timestampToleranceMs) {
    return { ok: false, reason: "invalid_timestamp" };
  }

  return { ok: true };
}
