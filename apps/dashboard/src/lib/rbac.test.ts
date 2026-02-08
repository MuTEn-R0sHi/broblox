/**
 * Tests for Role-Based Access Control (RBAC).
 *
 * Covers: hasPermission, hasAllPermissions, hasAnyPermission,
 * getPermissions, canModifyRole, isRoleHigherOrEqual,
 * getRoleDisplayName, getRoleDescription.
 */

import { describe, it, expect } from "vitest";
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissions,
  canModifyRole,
  isRoleHigherOrEqual,
  getRoleDisplayName,
  getRoleDescription,
  type Permission,
} from "./rbac";

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe("hasPermission", () => {
  it("VIEWER can view dashboard", () => {
    expect(hasPermission("VIEWER", "view:dashboard")).toBe(true);
  });

  it("VIEWER cannot view audit", () => {
    expect(hasPermission("VIEWER", "view:audit")).toBe(false);
  });

  it("SUPPORT can view audit but cannot ban", () => {
    expect(hasPermission("SUPPORT", "view:audit")).toBe(true);
    expect(hasPermission("SUPPORT", "moderation:ban")).toBe(false);
  });

  it("MODERATOR can ban and handle appeals", () => {
    expect(hasPermission("MODERATOR", "moderation:ban")).toBe(true);
    expect(hasPermission("MODERATOR", "moderation:appeal")).toBe(true);
  });

  it("MODERATOR cannot toggle flags", () => {
    expect(hasPermission("MODERATOR", "flags:toggle:dev")).toBe(false);
    expect(hasPermission("MODERATOR", "flags:toggle:prod")).toBe(false);
  });

  it("ENGINEER can toggle dev and stage flags", () => {
    expect(hasPermission("ENGINEER", "flags:toggle:dev")).toBe(true);
    expect(hasPermission("ENGINEER", "flags:toggle:stage")).toBe(true);
  });

  it("ENGINEER cannot toggle prod flags", () => {
    expect(hasPermission("ENGINEER", "flags:toggle:prod")).toBe(false);
  });

  it("ADMIN has all permissions", () => {
    const allPerms: Permission[] = [
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
    ];
    for (const perm of allPerms) {
      expect(hasPermission("ADMIN", perm)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// hasAllPermissions / hasAnyPermission
// ---------------------------------------------------------------------------

describe("hasAllPermissions", () => {
  it("returns true when role has all specified permissions", () => {
    expect(hasAllPermissions("ADMIN", ["view:dashboard", "moderation:ban", "settings:edit"])).toBe(
      true
    );
  });

  it("returns false when role is missing one permission", () => {
    expect(hasAllPermissions("VIEWER", ["view:dashboard", "view:audit"])).toBe(false);
  });

  it("returns true for empty permission list", () => {
    expect(hasAllPermissions("VIEWER", [])).toBe(true);
  });
});

describe("hasAnyPermission", () => {
  it("returns true when role has at least one specified permission", () => {
    expect(hasAnyPermission("VIEWER", ["moderation:ban", "view:dashboard"])).toBe(true);
  });

  it("returns false when role has none of the specified permissions", () => {
    expect(hasAnyPermission("VIEWER", ["moderation:ban", "settings:edit"])).toBe(false);
  });

  it("returns false for empty permission list", () => {
    expect(hasAnyPermission("ADMIN", [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getPermissions
// ---------------------------------------------------------------------------

describe("getPermissions", () => {
  it("returns non-empty array for each role", () => {
    const roles = ["VIEWER", "SUPPORT", "MODERATOR", "ENGINEER", "ADMIN"] as const;
    for (const role of roles) {
      expect(getPermissions(role).length).toBeGreaterThan(0);
    }
  });

  it("ADMIN has more permissions than VIEWER", () => {
    expect(getPermissions("ADMIN").length).toBeGreaterThan(getPermissions("VIEWER").length);
  });
});

// ---------------------------------------------------------------------------
// isRoleHigherOrEqual
// ---------------------------------------------------------------------------

describe("isRoleHigherOrEqual", () => {
  it("same role is equal", () => {
    expect(isRoleHigherOrEqual("MODERATOR", "MODERATOR")).toBe(true);
  });

  it("ADMIN is higher than all others", () => {
    expect(isRoleHigherOrEqual("ADMIN", "VIEWER")).toBe(true);
    expect(isRoleHigherOrEqual("ADMIN", "SUPPORT")).toBe(true);
    expect(isRoleHigherOrEqual("ADMIN", "MODERATOR")).toBe(true);
    expect(isRoleHigherOrEqual("ADMIN", "ENGINEER")).toBe(true);
  });

  it("VIEWER is not higher than SUPPORT", () => {
    expect(isRoleHigherOrEqual("VIEWER", "SUPPORT")).toBe(false);
  });

  it("ENGINEER is higher than MODERATOR", () => {
    expect(isRoleHigherOrEqual("ENGINEER", "MODERATOR")).toBe(true);
  });

  it("MODERATOR is not higher than ENGINEER", () => {
    expect(isRoleHigherOrEqual("MODERATOR", "ENGINEER")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canModifyRole
// ---------------------------------------------------------------------------

describe("canModifyRole", () => {
  it("ADMIN can change VIEWER to MODERATOR", () => {
    expect(canModifyRole("ADMIN", "VIEWER", "MODERATOR")).toBe(true);
  });

  it("ADMIN can change MODERATOR to SUPPORT (demote)", () => {
    expect(canModifyRole("ADMIN", "MODERATOR", "SUPPORT")).toBe(true);
  });

  it("ADMIN can change role to ADMIN (assign same level)", () => {
    expect(canModifyRole("ADMIN", "VIEWER", "ADMIN")).toBe(true);
  });

  it("MODERATOR cannot modify roles", () => {
    expect(canModifyRole("MODERATOR", "VIEWER", "SUPPORT")).toBe(false);
  });

  it("ENGINEER cannot modify roles", () => {
    expect(canModifyRole("ENGINEER", "VIEWER", "SUPPORT")).toBe(false);
  });

  it("VIEWER cannot modify roles", () => {
    expect(canModifyRole("VIEWER", "VIEWER", "SUPPORT")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getRoleDisplayName / getRoleDescription
// ---------------------------------------------------------------------------

describe("getRoleDisplayName", () => {
  it("returns human-readable name for each role", () => {
    expect(getRoleDisplayName("VIEWER")).toBe("Viewer");
    expect(getRoleDisplayName("SUPPORT")).toBe("Support");
    expect(getRoleDisplayName("MODERATOR")).toBe("Moderator");
    expect(getRoleDisplayName("ENGINEER")).toBe("Engineer");
    expect(getRoleDisplayName("ADMIN")).toBe("Admin");
  });
});

describe("getRoleDescription", () => {
  it("returns non-empty description for each role", () => {
    const roles = ["VIEWER", "SUPPORT", "MODERATOR", "ENGINEER", "ADMIN"] as const;
    for (const role of roles) {
      expect(getRoleDescription(role).length).toBeGreaterThan(0);
    }
  });
});
