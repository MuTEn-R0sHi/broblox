/**
 * Authorization Middleware
 *
 * Server-side utilities for checking permissions in API routes and server actions.
 */

import { auth } from "./auth";
import { hasPermission, hasAnyPermission, Permission, Role } from "./rbac";
import { redirect } from "next/navigation";

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
    redirect("/dashboard?error=unauthorized");
  }

  return result;
}

/**
 * Require any of the specified permissions.
 */
export async function requireAnyPermission(permissions: Permission[]): Promise<AuthResult> {
  const result = await requireAuth();

  if (!hasAnyPermission(result.user.role, permissions)) {
    redirect("/dashboard?error=unauthorized");
  }

  return result;
}

/**
 * Require a minimum role level.
 */
export async function requireRole(minimumRole: Role): Promise<AuthResult> {
  const result = await requireAuth();

  const roleHierarchy: Record<Role, number> = {
    VIEWER: 0,
    SUPPORT: 1,
    MODERATOR: 2,
    ENGINEER: 3,
    ADMIN: 4,
  };

  if (roleHierarchy[result.user.role] < roleHierarchy[minimumRole]) {
    redirect("/dashboard?error=unauthorized");
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
