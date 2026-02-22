export interface DoActionPayload {
  actionId: string;
  timestamp: number;
  /** Optional game-specific payload attached to the action. */
  payload?: unknown;
}
