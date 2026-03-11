import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const cookieStore = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string) => {
        cookieStore.set(name, { value });
      },
    }),
}));

import { getCsrfToken, validateCsrf } from "./csrf";

// ---------------------------------------------------------------------------

beforeEach(() => {
  cookieStore.clear();
});

describe("getCsrfToken", () => {
  it("generates a token and stores it in a cookie", async () => {
    const token = await getCsrfToken();
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(cookieStore.get("__broblox_csrf")?.value).toBe(token);
  });

  it("returns existing token if cookie already set", async () => {
    const fakeToken = "ab".repeat(32);
    cookieStore.set("__broblox_csrf", { value: fakeToken });

    const token = await getCsrfToken();
    expect(token).toBe(fakeToken);
  });
});

describe("validateCsrf", () => {
  it("returns true when header matches cookie", () => {
    const token = "c".repeat(64);
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "x-csrf-token": token, cookie: `__broblox_csrf=${token}` },
    });
    expect(validateCsrf(request)).toBe(true);
  });

  it("returns false when header is missing", () => {
    const token = "d".repeat(64);
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { cookie: `__broblox_csrf=${token}` },
    });
    expect(validateCsrf(request)).toBe(false);
  });

  it("returns false when cookie is missing", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: { "x-csrf-token": "e".repeat(64) },
    });
    expect(validateCsrf(request)).toBe(false);
  });

  it("returns false when tokens do not match", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": "f".repeat(64),
        cookie: `__broblox_csrf=${"0".repeat(64)}`,
      },
    });
    expect(validateCsrf(request)).toBe(false);
  });

  it("returns false when lengths differ", () => {
    const request = new NextRequest("http://localhost:3000/api/test", {
      method: "POST",
      headers: {
        "x-csrf-token": "short",
        cookie: "__broblox_csrf=longer-value",
      },
    });
    expect(validateCsrf(request)).toBe(false);
  });
});
