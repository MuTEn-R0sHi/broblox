import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { ensureCsrfCookie, CSRF_COOKIE_NAME, validateCsrf } from "./csrf";

// ---------------------------------------------------------------------------

describe("ensureCsrfCookie", () => {
  it("sets a 64-char hex token cookie when none exists", () => {
    const request = new NextRequest("http://localhost:3000/");
    const response = NextResponse.next();

    ensureCsrfCookie(request, response);

    const cookie = response.cookies.get(CSRF_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie!.value).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it("does not overwrite an existing valid cookie", () => {
    const existing = "ab".repeat(32);
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `${CSRF_COOKIE_NAME}=${existing}` },
    });
    const response = NextResponse.next();

    ensureCsrfCookie(request, response);

    // Response should NOT have set a new cookie
    expect(response.cookies.get(CSRF_COOKIE_NAME)).toBeUndefined();
  });

  it("sets a new cookie when existing cookie has wrong length", () => {
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: `${CSRF_COOKIE_NAME}=tooshort` },
    });
    const response = NextResponse.next();

    ensureCsrfCookie(request, response);

    const cookie = response.cookies.get(CSRF_COOKIE_NAME);
    expect(cookie).toBeDefined();
    expect(cookie!.value).toHaveLength(64);
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
