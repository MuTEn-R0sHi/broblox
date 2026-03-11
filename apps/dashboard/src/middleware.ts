import { NextRequest, NextResponse } from "next/server";
import { ensureCsrfCookie } from "@/lib/csrf";

function getClientIp(request: NextRequest): string | null {
  // Prefer x-forwarded-for (Vercel/proxies). Use first entry.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return null;
}

function normalizeIpString(ip: string): string {
  return ip.trim().toLowerCase();
}

function parseIpv4ToUint32(ip: string): number | null {
  const trimmed = ip.trim();

  // Handle IPv6-mapped IPv4 addresses like ::ffff:192.168.0.1
  const v6MappedPrefix = "::ffff:";
  const v6MappedIndex = trimmed.toLowerCase().lastIndexOf(v6MappedPrefix);
  const maybeIpv4 =
    v6MappedIndex >= 0 ? trimmed.slice(v6MappedIndex + v6MappedPrefix.length) : trimmed;

  const parts = maybeIpv4.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^[0-9]{1,3}$/u.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = (value << 8) | octet;
  }

  return value >>> 0;
}

type AllowlistRule =
  | { kind: "ipv4-cidr"; network: number; mask: number }
  | { kind: "ip-exact"; ip: string };

function maskFromPrefix(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

function parseAllowlistRule(entry: string): AllowlistRule | null {
  const trimmed = entry.trim();
  if (!trimmed) return null;

  const [ipPart, prefixPart] = trimmed.split("/");
  const normalizedIp = normalizeIpString(ipPart);

  const ipv4 = parseIpv4ToUint32(normalizedIp);
  if (ipv4 !== null) {
    const prefix = prefixPart === undefined ? 32 : Number(prefixPart);
    if (!Number.isFinite(prefix) || prefix < 0 || prefix > 32) return null;
    const mask = maskFromPrefix(prefix);
    const network = ipv4 & mask;
    return { kind: "ipv4-cidr", network, mask };
  }

  // For IPv6 (or any non-IPv4), support exact matches only.
  if (prefixPart !== undefined) return null;
  return { kind: "ip-exact", ip: normalizedIp };
}

function parseAllowlistEnv(value: string | undefined): AllowlistRule[] {
  const raw = value?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseAllowlistRule)
    .filter((rule): rule is AllowlistRule => rule !== null);
}

function isIpAllowed(clientIp: string, rules: AllowlistRule[]): boolean {
  if (rules.length === 0) return true;

  const normalized = normalizeIpString(clientIp);

  for (const rule of rules) {
    if (rule.kind === "ip-exact") {
      if (normalized === rule.ip) return true;
      continue;
    }

    const ipv4 = parseIpv4ToUint32(normalized);
    if (ipv4 === null) continue;

    if ((ipv4 & rule.mask) === rule.network) return true;
  }

  return false;
}

function isFlagsApiPath(pathname: string): boolean {
  return pathname === "/api/flags" || pathname.startsWith("/api/flags/");
}

function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function middleware(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  const { pathname } = request.nextUrl;

  // Set CSRF cookie for browser pages only — skip API routes to avoid
  // unnecessary Set-Cookie headers on high-QPS game-server endpoints.
  if (!isApiPath(pathname)) {
    ensureCsrfCookie(request, response);
  }

  const rules = parseAllowlistEnv(process.env.DASHBOARD_ALLOWED_IPS);
  if (rules.length === 0) return response;

  // Never block the flags API; it's meant for game servers and already requires an API key.
  if (isFlagsApiPath(pathname)) return response;

  const clientIp = getClientIp(request);
  if (clientIp && isIpAllowed(clientIp, rules)) return response;

  // If we can't determine the client IP, fail closed when allowlist is enabled.
  if (isApiPath(pathname)) {
    return NextResponse.json(
      { error: "Access restricted" },
      { status: 403, headers: { "cache-control": "no-store" } }
    );
  }

  const blockedUrl = request.nextUrl.clone();
  blockedUrl.pathname = "/blocked";
  return NextResponse.redirect(blockedUrl);
}

export const config = {
  matcher: ["/((?!login|blocked|_next/static|_next/image|favicon\\.ico).*)"],
};
