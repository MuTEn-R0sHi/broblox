/**
 * CSRF Protection
 *
 * Provides explicit CSRF token generation and validation for API routes.
 *
 * Next.js Server Actions already include implicit CSRF protection, but this
 * module adds an explicit double-submit cookie pattern for API routes that
 * accept mutations from the browser (not game servers — those use API keys).
 *
 * Usage:
 * - Call `ensureCsrfCookie(request, response)` in middleware to set the cookie.
 * - Call `validateCsrf(request)` in mutating API routes that are called from
 *   the browser (not game servers).
 */

import { NextRequest, NextResponse } from "next/server";

export const CSRF_COOKIE_NAME = "__broblox_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;

/** Generate a hex token using the Web Crypto API (Edge-compatible). */
function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Ensure the response carries a CSRF cookie. Call from middleware only
 * (Server Components / RSC cannot set cookies).
 *
 * The cookie is non-HttpOnly so client-side JS can read the value and send
 * it back as the `x-csrf-token` header (double-submit cookie pattern).
 */
export function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  const existing = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  if (existing && existing.length === TOKEN_BYTES * 2) return;

  const token = generateToken();
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by client JS for double-submit pattern
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

/**
 * Validate a CSRF token from the request header against the cookie.
 * Returns `true` if valid, `false` otherwise.
 */
export function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  // Constant-time comparison without Node crypto — compare char-by-char
  // and accumulate mismatches so timing doesn't leak which position differs.
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}
