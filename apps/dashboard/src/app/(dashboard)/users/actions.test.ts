import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockAuditRoleChange = vi.fn();

/**
 * Next.js `redirect()` throws to halt execution.
 * We replicate this so server-action control flow works identically in tests.
 */
class NextRedirect extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT: ${url}`);
  }
}
const mockRedirect = vi.fn((url: string) => {
  throw new NextRedirect(url);
});

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      update: (...a: unknown[]) => mockUserUpdate(...a),
    },
  },
}));

vi.mock("@/lib/authorize", () => ({
  checkPermission: (...a: unknown[]) => mockAuth(...a),
}));

vi.mock("@/lib/audit", () => ({
  auditRoleChange: (...a: unknown[]) => mockAuditRoleChange(...a),
}));

vi.mock("@/lib/high-risk", async () => {
  const actual = await vi.importActual<typeof import("@/lib/high-risk")>("@/lib/high-risk");
  return actual;
});

vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return actual;
});

vi.mock("next/navigation", () => ({
  redirect: (...a: unknown[]) => mockRedirect(...a),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { updateUserRole } from "./actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN = {
  user: { id: "admin-1", name: "Admin", email: "a@t.com", role: "ADMIN" },
};

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.set(k, v);
  return fd;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("users/actions — updateUserRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply throw behaviour after resetAllMocks clears implementation
    mockRedirect.mockImplementation((url: string) => {
      throw new NextRedirect(url);
    });
  });

  it("redirects when unauthorized", async () => {
    mockAuth.mockResolvedValue(null);
    await expect(updateUserRole(makeFormData({ userId: "u1", role: "MODERATOR" }))).rejects.toThrow(
      NextRedirect
    );
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=forbidden");
  });

  it("redirects when userId is missing", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(updateUserRole(makeFormData({ userId: "", role: "MODERATOR" }))).rejects.toThrow(
      NextRedirect
    );
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=invalid_request");
  });

  it("redirects for invalid role value", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(
      updateUserRole(makeFormData({ userId: "u1", role: "SUPER_ADMIN" }))
    ).rejects.toThrow(NextRedirect);
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=invalid_role");
  });

  it("prevents self-edit", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    await expect(
      updateUserRole(makeFormData({ userId: "admin-1", role: "MODERATOR" }))
    ).rejects.toThrow(NextRedirect);
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=cannot_edit_self");
  });

  it("redirects when target user not found", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUserFindUnique.mockResolvedValue(null);
    await expect(
      updateUserRole(makeFormData({ userId: "u99", role: "MODERATOR" }))
    ).rejects.toThrow(NextRedirect);
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=not_found");
  });

  it("redirects when RBAC denies the role change", async () => {
    // Non-ADMIN cannot modify roles
    const engineer = {
      user: { id: "eng-1", name: "Eng", email: "e@t.com", role: "ENGINEER" },
    };
    mockAuth.mockResolvedValue(engineer);
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "VIEWER" });
    await expect(updateUserRole(makeFormData({ userId: "u1", role: "MODERATOR" }))).rejects.toThrow(
      NextRedirect
    );
    expect(mockRedirect).toHaveBeenCalledWith("/users?error=forbidden");
  });

  it("no-ops when the role is unchanged", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "MODERATOR" });
    await updateUserRole(
      makeFormData({
        userId: "u1",
        role: "MODERATOR",
        reason: "no change",
        confirmation: "set role u1 MODERATOR",
      })
    );
    // Should return early — no DB update
    expect(mockUserUpdate).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("requires high-risk confirmation", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "VIEWER" });
    await expect(
      updateUserRole(makeFormData({ userId: "u1", role: "ADMIN", reason: "Promoting the user" }))
    ).rejects.toThrow("Confirmation must match");
  });

  it("requires reason of at least 5 characters", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "VIEWER" });
    await expect(
      updateUserRole(makeFormData({ userId: "u1", role: "ADMIN", reason: "hi" }))
    ).rejects.toThrow("Reason must be at least 5 characters");
  });

  it("updates role with valid confirmation and audits", async () => {
    mockAuth.mockResolvedValue(ADMIN);
    mockUserFindUnique.mockResolvedValue({ id: "u1", role: "VIEWER" });
    mockUserUpdate.mockResolvedValue({});

    await updateUserRole(
      makeFormData({
        userId: "u1",
        role: "MODERATOR",
        reason: "Promoting to moderator",
        confirmation: "set role u1 MODERATOR",
      })
    );

    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { role: "MODERATOR" },
      })
    );
    expect(mockAuditRoleChange).toHaveBeenCalledWith(
      "admin-1",
      "u1",
      "VIEWER",
      "MODERATOR",
      "Promoting to moderator"
    );
  });
});
