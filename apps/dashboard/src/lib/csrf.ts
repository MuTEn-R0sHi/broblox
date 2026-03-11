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
 * - Call `setCsrfCookie()` in the dashboard layout to set the token cookie.
 * - Call `validateCsrf(request)` in mutating API routes that are called from
 *   the browser (not game servers).
 */

import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { randomBytes, timingSafeEqual } from "crypto";

const CSRF_COOKIE_NAME = "__broblox_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_BYTES = 32;

/**
 * Get or generate a CSRF token and set it as a cookie.
 *
 * The cookie is non-HttpOnly so client-side JS can read the value and send
 * it back as the `x-csrf-token` header (double-submit cookie pattern).
 * Returns the token value.
 */
export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CSRF_COOKIE_NAME);

  if (existing?.value && existing.value.length === TOKEN_BYTES * 2) {
    return existing.value;
  }

  const token = randomBytes(TOKEN_BYTES).toString("hex");
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // must be readable by client JS for double-submit pattern
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  return token;
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

  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}
