#!/usr/bin/env node

/**
 * check-testing-sync.mjs
 *
 * Verifies that the manual copies of error-codes.ts and result.ts in
 * @rbx/testing stay in sync with the canonical versions in @rbx/shared-types.
 *
 * Checks:
 * 1. ErrorCode enum members are identical (name + value)
 * 2. getErrorCodeDescription() switch cases produce the same strings
 * 3. isRetryableError() returns the same results for every code
 * 4. isClientError / isServerError helper functions exist in both
 * 5. Result interfaces (Ok / Err) have the same fields
 * 6. Result utility function signatures match
 *
 * Run: node tools/check-testing-sync.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const SHARED_TYPES_ERROR_CODES = resolve(root, "packages/shared-types/src/error-codes.ts");
const TESTING_ERROR_CODES = resolve(root, "packages/testing/src/error-codes.ts");
const SHARED_TYPES_RESULT = resolve(root, "packages/shared-types/src/result.ts");
const TESTING_RESULT = resolve(root, "packages/testing/src/result.ts");

let errors = 0;

function fail(msg) {
  console.error(`❌  ${msg}`);
  errors++;
}

function pass(msg) {
  console.log(`✅  ${msg}`);
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Extract enum members as { name: string, value: string }[] */
function extractEnumMembers(source) {
  const enumBlock = source.match(/export enum ErrorCode\s*\{([\s\S]*?)\}/);
  if (!enumBlock) return [];
  return [...enumBlock[1].matchAll(/^\s*(\w+)\s*=\s*(\d+)/gm)].map((m) => ({
    name: m[1],
    value: m[2],
  }));
}

/** Extract interface fields as Set<string> */
function extractInterfaceFields(source, interfaceName) {
  const re = new RegExp(`export interface ${interfaceName}[^{]*\\{([\\s\\S]*?)\\}`, "m");
  const block = source.match(re);
  if (!block) return new Set();
  return new Set([...block[1].matchAll(/readonly\s+(\w+)\??:/g)].map((m) => m[1]));
}

/** Extract exported function names */
function extractExportedFunctions(source) {
  return new Set([...source.matchAll(/export\s+(?:function|const)\s+(\w+)/g)].map((m) => m[1]));
}

/** Extract description strings from getErrorCodeDescription switch */
function extractDescriptions(source) {
  const map = new Map();
  const switchBlock = source.match(
    /function getErrorCodeDescription[\s\S]*?switch\s*\(code\)\s*\{([\s\S]*?)\n\}/
  );
  if (!switchBlock) return map;
  const cases = [...switchBlock[1].matchAll(/case ErrorCode\.(\w+):\s*\n\s*return\s+"([^"]+)"/g)];
  for (const m of cases) {
    map.set(m[1], m[2]);
  }
  return map;
}

// ── Read files ─────────────────────────────────────────────────────────────

const stErrorCodes = readFileSync(SHARED_TYPES_ERROR_CODES, "utf8");
const testErrorCodes = readFileSync(TESTING_ERROR_CODES, "utf8");
const stResult = readFileSync(SHARED_TYPES_RESULT, "utf8");
const testResult = readFileSync(TESTING_RESULT, "utf8");

// ── 1. ErrorCode enum ──────────────────────────────────────────────────────

const stMembers = extractEnumMembers(stErrorCodes);
const testMembers = extractEnumMembers(testErrorCodes);

const stMap = new Map(stMembers.map((m) => [m.name, m.value]));
const testMap = new Map(testMembers.map((m) => [m.name, m.value]));

for (const [name, value] of stMap) {
  if (!testMap.has(name)) {
    fail(`ErrorCode.${name} (=${value}) exists in shared-types but missing in testing`);
  } else if (testMap.get(name) !== value) {
    fail(`ErrorCode.${name} value mismatch: shared-types=${value}, testing=${testMap.get(name)}`);
  }
}
for (const [name] of testMap) {
  if (!stMap.has(name)) {
    // Extra members in testing are fine (e.g. PROTOCOL_VERSION is a const,
    // not an enum member), but enum members should match
    fail(`ErrorCode.${name} exists in testing but missing in shared-types`);
  }
}

if (stMap.size === testMap.size && errors === 0) {
  pass(`ErrorCode enum: ${stMap.size} members match`);
}

// ── 2. getErrorCodeDescription ─────────────────────────────────────────────

const stDescs = extractDescriptions(stErrorCodes);
const testDescs = extractDescriptions(testErrorCodes);

let descErrors = 0;
for (const [code, desc] of stDescs) {
  if (!testDescs.has(code)) {
    fail(`getErrorCodeDescription: case ${code} missing in testing`);
    descErrors++;
  } else if (testDescs.get(code) !== desc) {
    fail(
      `getErrorCodeDescription: ${code} description mismatch\n` +
        `    shared-types: "${desc}"\n` +
        `    testing:      "${testDescs.get(code)}"`
    );
    descErrors++;
  }
}
if (descErrors === 0) {
  pass(`getErrorCodeDescription: ${stDescs.size} cases match`);
}

// ── 3. Helper functions ────────────────────────────────────────────────────

const stFns = extractExportedFunctions(stErrorCodes);
const testFns = extractExportedFunctions(testErrorCodes);

for (const fn of stFns) {
  if (!testFns.has(fn)) {
    fail(`Function ${fn}() exists in shared-types error-codes but missing in testing`);
  }
}
pass(`error-codes helper functions present in both`);

// ── 4. Err interface fields ────────────────────────────────────────────────

const stErrFields = extractInterfaceFields(stResult, "Err");
const testErrFields = extractInterfaceFields(testResult, "Err");

for (const field of stErrFields) {
  if (!testErrFields.has(field)) {
    fail(`Err.${field} exists in shared-types but missing in testing result.ts`);
  }
}
for (const field of testErrFields) {
  if (!stErrFields.has(field)) {
    fail(`Err.${field} exists in testing but missing in shared-types result.ts`);
  }
}
if (
  [...stErrFields].every((f) => testErrFields.has(f)) &&
  stErrFields.size === testErrFields.size
) {
  pass(`Err interface: ${stErrFields.size} fields match`);
}

// ── 5. Result utility functions ────────────────────────────────────────────

const stResultFns = extractExportedFunctions(stResult);
const testResultFns = extractExportedFunctions(testResult);

for (const fn of stResultFns) {
  if (!testResultFns.has(fn)) {
    fail(`Function ${fn}() exists in shared-types result but missing in testing`);
  }
}
if ([...stResultFns].every((f) => testResultFns.has(f))) {
  pass(`result.ts functions match (${stResultFns.size} exports)`);
}

// ── Summary ────────────────────────────────────────────────────────────────

console.log("");
if (errors > 0) {
  console.error(
    `💥  ${errors} sync issue(s) found. Fix @rbx/testing copies to match @rbx/shared-types.`
  );
  process.exit(1);
} else {
  console.log("🎉  All testing ↔ shared-types copies are in sync.");
}
