export function normalizeHighRiskReason(reason: unknown): string {
  const normalized = typeof reason === "string" ? reason.trim() : "";
  if (normalized.length < 5) {
    throw new Error("Reason must be at least 5 characters");
  }
  return normalized;
}

function normalizeConfirmation(value: unknown): string {
  const text = typeof value === "string" ? value : "";
  return text.trim().replace(/\s+/gu, " ");
}

export function assertHighRiskConfirmation(
  provided: unknown,
  expected: string,
  errorMessage = "Confirmation text did not match"
): void {
  const normalizedProvided = normalizeConfirmation(provided);
  const normalizedExpected = normalizeConfirmation(expected);
  if (!normalizedProvided || normalizedProvided !== normalizedExpected) {
    throw new Error(errorMessage);
  }
}
