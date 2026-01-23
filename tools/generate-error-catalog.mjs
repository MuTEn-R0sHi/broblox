#!/usr/bin/env node
/**
 * Generate error code catalog from ErrorCode enum
 * Usage: node tools/generate-error-catalog.mjs > docs/reference/error-codes.md
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the shared-types source file
const sharedTypesPath = join(__dirname, "../packages/shared-types/src/index.ts");
const content = readFileSync(sharedTypesPath, "utf-8");

// Extract ErrorCode enum
const enumMatch = content.match(/export enum ErrorCode \{([^}]+)\}/s);
if (!enumMatch) {
  console.error("Could not find ErrorCode enum");
  process.exit(1);
}

const enumBody = enumMatch[1];
const entries = [];

// Parse enum entries
const lines = enumBody.split("\n");
for (const line of lines) {
  const match = line.match(/^\s*(\w+)\s*=\s*(\d+),?\s*(?:\/\/\s*(.*))?$/);
  if (match) {
    const [, name, code, comment] = match;
    entries.push({ name, code: parseInt(code), comment: comment?.trim() || "" });
  }
}

// Group by range
const ranges = {
  "0xxx": { title: "General Errors", codes: [] },
  "1xxx": { title: "Validation Errors", codes: [] },
  "2xxx": { title: "Business Logic Errors", codes: [] },
  "3xxx": { title: "Protocol Errors", codes: [] },
  "4xxx": { title: "Authorization Errors", codes: [] },
  "5xxx": { title: "Internal Errors", codes: [] },
};

for (const entry of entries) {
  const range = Math.floor(entry.code / 1000);
  const key = `${range}xxx`;
  if (ranges[key]) {
    ranges[key].codes.push(entry);
  }
}

// Generate markdown
console.log("# Error Code Reference");
console.log();
console.log(
  "This document is **auto-generated** from the `ErrorCode` enum in `@rbx/shared-types`."
);
console.log();
console.log("## Error Code Ranges");
console.log();
console.log("- **0xxx**: General errors (unknown, unspecified)");
console.log("- **1xxx**: Validation errors (schema, bounds, types)");
console.log("- **2xxx**: Business logic errors (cooldowns, state, resources)");
console.log("- **3xxx**: Protocol errors (version mismatch, compatibility)");
console.log("- **4xxx**: Authorization errors (permissions, sessions)");
console.log("- **5xxx**: Internal errors (server issues, timeouts)");
console.log();

for (const [range, data] of Object.entries(ranges)) {
  if (data.codes.length === 0) continue;

  console.log(`## ${data.title} (${range})`);
  console.log();
  console.log("| Code | Name | Description |");
  console.log("|------|------|-------------|");

  for (const entry of data.codes) {
    const desc = entry.comment || "*No description*";
    console.log(`| ${entry.code} | \`${entry.name}\` | ${desc} |`);
  }

  console.log();
}

console.log("## Adding New Error Codes");
console.log();
console.log(
  "1. Add the error code to the `ErrorCode` enum in `packages/shared-types/src/index.ts`"
);
console.log("2. Follow the range conventions above");
console.log("3. Never reuse or change existing codes (breaking change)");
console.log("4. Regenerate this document:");
console.log();
console.log("```bash");
console.log("node tools/generate-error-catalog.mjs > docs/reference/error-codes.md");
console.log("```");
console.log();
console.log("---");
console.log();
console.log(`*Last updated: ${new Date().toISOString().split("T")[0]}*`);
