/**
 * Authorization Middleware
 *
 * Server-side utilities for checking permissions in API routes and server actions.
 */

import { timingSafeEqual } from "crypto";

import { auth } from "./auth";
import { hasPermission, hasAnyPermission, isRoleHigherOrEqual, Permission, Role } from "./rbac";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
}

export interface AuthResult {
  user: AuthUser;
}

// ============================================================================
// Authorization Functions
// ============================================================================

/**
 * Get the current authenticated user, or redirect to login.
 */
export async function requireAuth(): Promise<AuthResult> {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Get role from session (added in auth callbacks)
  const role = (session.user as AuthUser).role ?? "VIEWER";

  return {
    user: {
      id: session.user.id!,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role,
    },
  };
}

/**
 * Require a specific permission, redirect to dashboard if not authorized.
 */
export async function requirePermission(permission: Permission): Promise<AuthResult> {
  const result = await requireAuth();

  if (!hasPermission(result.user.role, permission)) {
    redirect("/?error=unauthorized");
  }

  return result;
}

/**
 * Require any of the specified permissions.
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthResult> {
  const result = await requireAuth();

  if (!hasAnyPermission(result.user.role, permissions)) {
    redirect("/?error=unauthorized");
  }

  return result;
}

/**
 * Require a minimum role level.
 */
export async function requireRole(minimumRole: Role): Promise<AuthResult> {
  const result = await requireAuth();

  if (!isRoleHigherOrEqual(result.user.role, minimumRole)) {
    redirect("/?error=unauthorized");
  }

  return result;
}

// ============================================================================
// API Route Helpers
// ============================================================================

/**
 * Check auth for API routes (returns null instead of redirecting).
 */
export async function checkAuth(): Promise<AuthResult | null> {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const role = (session.user as AuthUser).role ?? "VIEWER";

  return {
    user: {
      id: session.user.id!,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role,
    },
  };
}

/**
 * Check if current user has permission (for API routes).
 */
export async function checkPermission(permission: Permission): Promise<AuthResult | null> {
  const result = await checkAuth();

  if (!result || !hasPermission(result.user.role, permission)) {
    return null;
  }

  return result;
}

/**
 * Create an unauthorized response for API routes.
 */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return Response.json({ error: message }, { status: 401 });
}

/**
 * Create a forbidden response for API routes.
 */
export function forbiddenResponse(message = "Forbidden"): Response {
  return Response.json({ error: message }, { status: 403 });
}

/**
 * Require a permission for API routes.
 * Returns an AuthResult on success, otherwise a Response (401/403).
 */
export async function requireApiPermission(permission: Permission): Promise<AuthResult | Response> {
  const session = await auth();

  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const role = (session.user as AuthUser).role ?? "VIEWER";
  const result: AuthResult = {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      role,
    },
  };

  if (!hasPermission(result.user.role, permission)) {
    return forbiddenResponse();
  }

  return result;
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Validate the `x-api-key` header against an API key from the environment.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param request - Incoming request with an `x-api-key` header.
 * @param envVar - Environment variable that holds the expected key (default `GAME_SERVER_API_KEY`).
 */
export function validateApiKey(
  request: NextRequest,
  envVar: string = "GAME_SERVER_API_KEY"
): boolean {
  const apiKey = request.headers.get("x-api-key");
  const expected = process.env[envVar];
  if (!apiKey || !expected) return false;
  if (apiKey.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(apiKey), Buffer.from(expected));
}

// ============================================================================
// Rate Limiting
// ============================================================================

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 60; // per window
const RATE_LIMIT_CLEANUP_INTERVAL_MS = 300_000; // 5 minutes

// Periodic cleanup of stale entries
let cleanupTimer: ReturnType<typeof setInterval> | undefined;
function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS;
    for (const [key, entry] of rateLimitStore) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) rateLimitStore.delete(key);
    }
  }, RATE_LIMIT_CLEANUP_INTERVAL_MS);
  // Don't block process exit
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    cleanupTimer.unref();
  }
}

/**
 * In-memory sliding-window rate limiter (per-instance fallback).
 */
function checkRateLimitLocal(
  key: string,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): boolean {
  ensureCleanupTimer();

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = rateLimitStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }

  // Remove expired timestamps
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxRequests) {
    return false; // rate limited
  }

  entry.timestamps.push(now);
  return true; // allowed
}

/**
 * Distributed rate limiter using the database.
 * Falls back to in-memory when the table is not available.
 */
async function checkRateLimitDistributed(
  key: string,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): Promise<boolean> {
  try {
    const { prisma } = await import("./db");
    const now = Date.now();
    const windowStart = now - windowMs;

    // Upsert: if the bucket's window is stale, reset it; otherwise increment
    const bucket = await prisma.rateLimitBucket.upsert({
      where: { key },
      create: {
        key,
        count: 1,
        windowStart: BigInt(now),
      },
      update: {
        count: {
          increment: 1,
        },
      },
    });

    // If the existing bucket's window has expired, reset it
    if (Number(bucket.windowStart) < windowStart) {
      await prisma.rateLimitBucket.update({
        where: { key },
        data: {
          count: 1,
          windowStart: BigInt(now),
        },
      });
      return true;
    }

    return bucket.count <= maxRequests;
  } catch {
    // Table doesn't exist or DB unavailable — fall back to in-memory
    return checkRateLimitLocal(key, maxRequests, windowMs);
  }
}

/**
 * Simple in-memory sliding-window rate limiter.
 * Returns `true` if the request is allowed, `false` if rate-limited.
 *
 * @param key - Unique key for the rate limit bucket (e.g. API key or IP).
 * @param maxRequests - Max requests per window (default 60).
 * @param windowMs - Window duration in ms (default 60_000).
 */
export function checkRateLimit(
  key: string,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): boolean {
  return checkRateLimitLocal(key, maxRequests, windowMs);
}

/**
 * Distributed rate limiter (async). Uses database for cross-instance state,
 * with automatic fallback to in-memory when the DB is unavailable.
 */
export async function checkRateLimitAsync(
  key: string,
  maxRequests = RATE_LIMIT_MAX_REQUESTS,
  windowMs = RATE_LIMIT_WINDOW_MS
): Promise<boolean> {
  return checkRateLimitDistributed(key, maxRequests, windowMs);
}

/**
 * Get a rate-limit key from a request (API key or fallback to IP).
 */
export function getRateLimitKey(request: NextRequest): string {
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) return `apikey:${apiKey}`;
  const ip =
    request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
  return `ip:${ip}`;
}

// ============================================================================
// Cron Secret Validation
// ============================================================================

/**
 * Validate the `Authorization: Bearer <secret>` header for cron/job routes.
 *
 * Uses constant-time comparison to prevent timing attacks.
 *
 * Set `CRON_SECRET` in your deployment environment. When `CRON_SECRET` is not
 * set, this function always returns `false` (fail-closed).
 *
 * @example
 * ```ts
 * if (!validateCronSecret(request)) {
 *   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 * }
 * ```
 */
export function validateCronSecret(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return false;

  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;

  const provided = authHeader.slice(prefix.length);
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}
