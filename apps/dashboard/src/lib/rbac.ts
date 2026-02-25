/**
 * Role-Based Access Control (RBAC)
 *
 * Defines permissions for each role and provides authorization utilities.
 */

import { Role } from "@prisma/client";

// ============================================================================
// Permission Definitions
// ============================================================================

export type Permission =
  // View permissions
  | "view:dashboard"
  | "view:matches"
  | "view:players"
  | "view:flags"
  | "view:audit"
  // Game registry permissions
  | "games:view"
  | "games:create"
  | "games:manage"
  | "games:delete"
  // Moderation permissions
  | "moderation:view"
  | "moderation:mute"
  | "moderation:ban"
  | "moderation:appeal"
  | "moderation:bulk"
  // Flag permissions
  | "flags:toggle:dev"
  | "flags:toggle:stage"
  | "flags:toggle:prod"
  | "flags:create"
  | "flags:delete"
  | "flags:kill"
  // User management
  | "users:view"
  | "users:manage"
  | "users:roles"
  // Settings
  | "settings:view"
  | "settings:edit"
  // News CMS
  | "news:view"
  | "news:create"
  | "news:edit"
  | "news:delete";

/** Permission matrix - maps roles to their permissions */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  VIEWER: ["view:dashboard", "view:matches", "view:players", "view:flags", "news:view"],

  SUPPORT: [
    "view:dashboard",
    "view:matches",
    "view:players",
    "view:flags",
    "view:audit",
    "moderation:view",
  ],

  MODERATOR: [
    "view:dashboard",
    "view:matches",
    "view:players",
    "view:flags",
    "view:audit",
    "moderation:view",
    "moderation:mute",
    "moderation:ban",
    "moderation:appeal",
    "moderation:bulk",
    "news:view",
    "news:create",
    "news:edit",
  ],

  ENGINEER: [
    "view:dashboard",
    "view:matches",
    "view:players",
    "view:flags",
    "view:audit",
    "games:view",
    "games:create",
    "games:manage",
    "moderation:view",
    "flags:toggle:dev",
    "flags:toggle:stage",
    "flags:create",
    "settings:view",
    "news:view",
    "news:create",
    "news:edit",
  ],

  ADMIN: [
    "view:dashboard",
    "view:matches",
    "view:players",
    "view:flags",
    "view:audit",
    "games:view",
    "games:create",
    "games:manage",
    "games:delete",
    "moderation:view",
    "moderation:mute",
    "moderation:ban",
    "moderation:appeal",
    "moderation:bulk",
    "flags:toggle:dev",
    "flags:toggle:stage",
    "flags:toggle:prod",
    "flags:create",
    "flags:delete",
    "flags:kill",
    "users:view",
    "users:manage",
    "users:roles",
    "settings:view",
    "settings:edit",
    "news:view",
    "news:create",
    "news:edit",
    "news:delete",
  ],
};

// ============================================================================
// Authorization Functions
// ============================================================================

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions.
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Check if a role has ANY of the specified permissions.
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Get human-readable role name.
 */
export function getRoleDisplayName(role: Role): string {
  const names: Record<Role, string> = {
    VIEWER: "Viewer",
    SUPPORT: "Support",
    MODERATOR: "Moderator",
    ENGINEER: "Engineer",
    ADMIN: "Admin",
  };
  return names[role] ?? role;
}

/**
 * Get role description.
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    VIEWER: "Can view dashboards and basic information",
    SUPPORT: "Can view audit logs and moderation history",
    MODERATOR: "Can issue bans, mutes, and handle appeals",
    ENGINEER: "Can manage and create games, toggle feature flags in dev/stage",
    ADMIN: "Full access to all features including game deletion and prod toggles",
  };
  return descriptions[role] ?? "";
}

// ============================================================================
// Role Hierarchy
// ============================================================================

const ROLE_HIERARCHY: Record<Role, number> = {
  VIEWER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ENGINEER: 3,
  ADMIN: 4,
};

/**
 * Check if roleA is higher or equal to roleB in the hierarchy.
 */
export function isRoleHigherOrEqual(roleA: Role, roleB: Role): boolean {
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Check if a user can modify another user's role.
 */
export function canModifyRole(
  actorRole: Role,
  targetCurrentRole: Role,
  targetNewRole: Role
): boolean {
  // Only admins can modify roles
  if (actorRole !== "ADMIN") return false;
  // Can't modify or assign roles higher than your own
  return (
    isRoleHigherOrEqual(actorRole, targetCurrentRole) &&
    isRoleHigherOrEqual(actorRole, targetNewRole)
  );
}

// ============================================================================
// Type Exports
// ============================================================================

export { Role };
