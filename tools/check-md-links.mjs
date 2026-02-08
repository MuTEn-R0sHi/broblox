import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const IGNORE_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  "site",
]);

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      yield path.join(dir, entry.name);
    }
  }
}

function normalizeLinkTarget(rawTarget) {
  // Strip surrounding whitespace
  let target = rawTarget.trim();

  // Ignore URL-only anchors
  if (target.startsWith("#")) return null;

  // Ignore external schemes
  const lower = target.toLowerCase();
  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  ) {
    return null;
  }

  // Strip query/hash
  target = target.split("#")[0].split("?")[0];
  target = target.trim();
  if (!target) return null;

  // Ignore mkdocs /site links or other non-file pseudo-paths
  if (target === "/") return null;

  return target;
}

function resolveCandidatePaths(mdFile, target) {
  const mdDir = path.dirname(mdFile);

  // Treat /foo/bar as repo-root relative
  const basePath = target.startsWith("/")
    ? path.join(repoRoot, target.slice(1))
    : path.resolve(mdDir, target);

  const candidates = [basePath];

  // If no extension, MkDocs commonly allows omission of .md
  if (!path.extname(basePath)) {
    candidates.push(`${basePath}.md`);
    candidates.push(path.join(basePath, "index.md"));
  }

  return candidates;
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g;

const broken = [];

for (const mdFile of walk(repoRoot)) {
  const content = fs.readFileSync(mdFile, "utf8");
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    const rawTarget = match[1];
    if (!rawTarget) continue;

    const target = normalizeLinkTarget(rawTarget);
    if (!target) continue;

    const candidates = resolveCandidatePaths(mdFile, target);
    const ok = candidates.some((candidate) => fileExists(candidate));

    if (!ok) {
      broken.push({
        mdFile: path.relative(repoRoot, mdFile),
        target,
      });
    }
  }
}

if (broken.length) {
  console.error(`Found ${broken.length} broken relative markdown link(s):`);
  for (const item of broken) {
    console.error(`- ${item.mdFile} -> ${item.target}`);
  }
  process.exitCode = 1;
} else {
  console.log("No broken relative markdown links found.");
}
