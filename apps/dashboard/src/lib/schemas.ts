/**
 * Zod Validation Schemas
 *
 * Centralized schemas for server action input validation.
 * Used by all dashboard server actions to replace ad-hoc manual checks.
 */

import { z } from "zod";

// ============================================================================
// Common Refinements
// ============================================================================

/** Non-empty trimmed string. */
const nonEmptyString = z.string().trim().min(1);

/** Trimmed string that may be empty / absent. */
const optionalString = z.string().trim().optional();

// ============================================================================
// Users
// ============================================================================

export const updateUserRoleSchema = z.object({
  userId: z.string().trim().min(1, "invalid_request"),
  role: z.enum(["VIEWER", "SUPPORT", "MODERATOR", "ENGINEER", "ADMIN"], {
    message: "invalid_role",
  }),
  reason: z.string().default(""),
  confirmation: z.string().default(""),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ============================================================================
// News
// ============================================================================

export const createNewsPostSchema = z.object({
  title: z.string().trim().min(1, "Title and body are required"),
  body: z.string().trim().min(1, "Title and body are required"),
  excerpt: optionalString.nullable(),
  tags: optionalString.nullable(),
  gameId: optionalString.nullable(),
  publish: z.boolean().default(false),
});

export type CreateNewsPostInput = z.infer<typeof createNewsPostSchema>;

export const updateNewsPostSchema = createNewsPostSchema;
export type UpdateNewsPostInput = z.infer<typeof updateNewsPostSchema>;

// ============================================================================
// Moderation — Bans
// ============================================================================

export const createBanSchema = z.object({
  playerId: nonEmptyString,
  playerName: optionalString,
  type: z.enum(["TEMPORARY", "PERMANENT"]),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters"),
  durationHours: z.number().positive().optional(),
  internalNote: optionalString,
});

export type CreateBanInput = z.infer<typeof createBanSchema>;

export const revokeBanSchema = z.object({
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
});

export type RevokeBanInput = z.infer<typeof revokeBanSchema>;

export const addEvidenceSchema = z.object({
  type: z.enum(["text", "screenshot", "video", "log"], {
    message: "Invalid evidence type",
  }),
  content: z
    .string()
    .trim()
    .min(3, "Evidence content must be at least 3 characters")
    .max(20_000, "Evidence content is too large"),
  description: optionalString,
});

export type AddEvidenceInput = z.infer<typeof addEvidenceSchema>;

// ============================================================================
// Moderation — Mutes
// ============================================================================

export const createMuteSchema = z.object({
  playerId: nonEmptyString,
  playerName: optionalString,
  type: z.enum(["CHAT", "VOICE", "ALL"]),
  reason: z.string().trim().min(5, "Reason must be at least 5 characters"),
  durationMinutes: z.number().int().min(1, "Invalid duration"),
});

export type CreateMuteInput = z.infer<typeof createMuteSchema>;

export const revokeMuteSchema = z.object({
  reason: z.string().trim().min(3, "Reason must be at least 3 characters"),
});

export type RevokeMuteInput = z.infer<typeof revokeMuteSchema>;

// ============================================================================
// Moderation — Appeals
// ============================================================================

export const resolveAppealSchema = z.object({
  status: z.enum(["APPROVED", "DENIED"]),
  resolution: z.string().trim().min(5, "Resolution must be at least 5 characters"),
});

export type ResolveAppealInput = z.infer<typeof resolveAppealSchema>;

// ============================================================================
// Games
// ============================================================================

export const createGameSchema = z.object({
  name: nonEmptyString,
  slug: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_-]*$/,
      "Slug must start with a lowercase letter and contain only lowercase letters, numbers, hyphens, and underscores"
    ),
  description: optionalString,
  iconUrl: optionalString,
  universeIdDev: optionalString,
  universeIdStage: optionalString,
  universeIdProd: optionalString,
  placeIdDev: optionalString,
  placeIdStage: optionalString,
  placeIdProd: optionalString,
});

export type CreateGameInput = z.infer<typeof createGameSchema>;

// ============================================================================
// Feature Flags
// ============================================================================

export const createFlagSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Key must start with a letter and contain only lowercase letters, numbers, and underscores"
    ),
  name: nonEmptyString,
  description: optionalString,
  gameId: optionalString.nullable(),
});

export type CreateFlagInput = z.infer<typeof createFlagSchema>;

export const updateRolloutSchema = z.object({
  rolloutPercentage: z.number().min(0).max(100).optional(),
  segments: z.array(z.string()).optional(),
  startsAt: z.coerce.date().nullable().optional(),
  endsAt: z.coerce.date().nullable().optional(),
});

export type UpdateRolloutInput = z.infer<typeof updateRolloutSchema>;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Parse FormData into a plain object, then validate with a schema.
 * Returns `{ data }` on success or `{ error }` with the first issue message.
 */
export function parseFormData<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: string } {
  const raw: Record<string, unknown> = {};
  formData.forEach((value, key) => {
    raw[key] = value === "true" ? true : value === "false" ? false : value;
  });
  const result = schema.safeParse(raw);
  if (result.success) {
    return { data: result.data };
  }
  return { error: result.error.issues[0]?.message ?? "Validation failed" };
}

/**
 * Validate a typed input against a schema.
 * Returns `{ data }` on success or `{ error }` with the first issue message.
 */
export function parseInput<T extends z.ZodTypeAny>(
  input: unknown,
  schema: T
): { data: z.infer<T>; error?: never } | { data?: never; error: string } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { data: result.data };
  }
  return { error: result.error.issues[0]?.message ?? "Validation failed" };
}
