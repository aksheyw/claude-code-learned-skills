#!/usr/bin/env node
// frontmatter-vocab-lint.mjs
//
// Flag-only validator for wiki frontmatter enum fields (`confidence`, `status`).
// It does NOT auto-fix: normalizing a numeric confidence (90 -> "high"?) or a
// freeform status is a judgment call, so violations are reported and classified
// for human triage only.
//
// Source of truth is each project's own `.claude/wiki/_schema.md`: the legal value
// set is parsed from there, never hardcoded. A field with no declared vocabulary in
// the schema (e.g. a lightweight wiki, or a schema that lists the field name
// but not its values) is reported as "not enforced", never flagged.
//
// Usage:
//   node frontmatter-vocab-lint.mjs [--base <dir>] [<wikiDir> ...]
//     --base <dir>   Base dir holding project folders (default: current directory)
//     <wikiDir> ...  Explicit `.claude/wiki` dirs to lint (overrides discovery)
//
// Exit codes: 0 = clean, 1 = violations found, 2 = tool error.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const FIELDS = ["confidence", "status"];
const out = (line = "") => process.stdout.write(`${line}\n`);

// --- argument parsing -------------------------------------------------------

const parseArgs = (argv) => {
  const rest = [...argv];
  const defaultBase = process.cwd();
  let base = defaultBase;
  const explicitDirs = [];
  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === "--base") {
      base = rest.shift();
      if (!base) throw new Error("--base requires a directory argument");
    } else {
      explicitDirs.push(arg);
    }
  }
  return { base, explicitDirs };
};

// --- wiki discovery ---------------------------------------------------------
// Only `<project>/.claude/wiki` at fixed depth — this naturally excludes
// `<project>/.claude/worktrees/*/.claude/wiki` and nested example snapshots.

const discoverWikiDirs = (base) => {
  if (!existsSync(base)) throw new Error(`base dir not found: ${base}`);
  // The base itself may BE a project (run from a project root): lint its own
  // wiki first, then fall back to child-project discovery (base holds projects).
  const ownWiki = join(base, ".claude", "wiki");
  const children = readdirSync(base)
    .map((entry) => join(base, entry, ".claude", "wiki"))
    .filter((dir) => existsSync(dir) && statSync(dir).isDirectory());
  return existsSync(ownWiki) && statSync(ownWiki).isDirectory()
    ? [ownWiki, ...children]
    : children;
};

// --- schema vocabulary extraction -------------------------------------------
// Find the `_schema.md` table row whose first cell is the field name, then take
// every backtick-wrapped token in that row as the legal set. Returns null when
// the field is not enumerated (cannot enforce -> will be skipped, not flagged).

const extractFieldVocab = (schemaText, field) => {
  const rowRe = new RegExp(`^\\|\\s*\`?${field}\`?\\s*\\|(.*)$`, "im");
  const match = schemaText.match(rowRe);
  if (!match) return null;
  const tokens = [...match[1].matchAll(/`([^`]+)`/g)]
    .map((m) => m[1].trim().toLowerCase())
    // drop tokens that are obviously prose/format hints, keep single-word enums
    .filter((tok) => tok.length > 0 && !tok.includes(" ") && !/[|]/.test(tok));
  return tokens.length > 0 ? new Set(tokens) : null;
};

const readSchemaVocab = (wikiDir) => {
  const schemaPath = join(wikiDir, "_schema.md");
  if (!existsSync(schemaPath)) return { vocab: {}, hasSchema: false };
  const text = readFileSync(schemaPath, "utf8");
  const vocab = Object.fromEntries(
    FIELDS.map((f) => [f, extractFieldVocab(text, f)]),
  );
  return { vocab, hasSchema: true };
};

// --- frontmatter parsing ----------------------------------------------------
// Parse ONLY the leading `---`...`---` block so schema-body examples are never
// read as page values.

const parseFrontmatter = (fileText) => {
  const lines = fileText.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return null;
  const fields = new Map();
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === "---") return fields;
    const sep = lines[i].indexOf(":");
    if (sep === -1) continue;
    const key = lines[i].slice(0, sep).trim();
    // Strip a trailing YAML comment (whitespace + #) and matched surrounding quotes,
    // so `status: "active"  # note` compares as `active`, not a false freeform flag.
    const value = lines[i]
      .slice(sep + 1)
      .replace(/\s+#.*$/, "")
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1");
    if (key) fields.set(key, value);
  }
  return null; // no closing fence -> treat as no frontmatter
};

// --- violation classification -----------------------------------------------
// Classify so the human can triage without the tool deciding the fix.

const classifyViolation = (rawValue, legalSet) => {
  const value = rawValue.trim();
  const lower = value.toLowerCase();
  if (legalSet.has(lower) && value !== lower) return "case-variant";
  if (/^-?\d/.test(value)) return "numeric"; // "90", "96 (post-review...)"
  const firstToken = lower.split(/[\s(—-]/)[0];
  if (legalSet.has(firstToken)) return "annotated"; // "high (device-verified 2026-05-01)"
  return "freeform";
};

// Exact-case membership: vocab sets are lowercased on extraction, so a
// case-variant value ("Active") IS a violation — classified as "case mismatch".
const isViolation = (rawValue, legalSet) => !legalSet.has(rawValue.trim());

// Recursive: some wikis organise pages in category subfolders. Skip hidden
// dirs (.obsidian) and any nested worktrees. Returns paths relative to wikiDir.
const listMarkdownPages = (wikiDir, rel = "") => {
  const here = join(wikiDir, rel);
  return readdirSync(here).flatMap((name) => {
    if (name.startsWith(".") || name === "worktrees") return [];
    const relPath = rel ? join(rel, name) : name;
    const full = join(wikiDir, relPath);
    if (statSync(full).isDirectory()) return listMarkdownPages(wikiDir, relPath);
    return name.endsWith(".md") ? [relPath] : [];
  });
};

const lintPage = (wikiDir, pageName, vocab) => {
  const text = readFileSync(join(wikiDir, pageName), "utf8");
  const fm = parseFrontmatter(text);
  if (!fm) return [];
  return FIELDS.flatMap((field) => {
    const legal = vocab[field];
    if (!legal) return []; // not enumerated in schema -> not enforced
    const raw = fm.get(field);
    if (raw === undefined) return []; // absent field is a different lint
    if (!isViolation(raw, legal)) return [];
    return [{ page: pageName, field, value: raw, kind: classifyViolation(raw, legal) }];
  });
};

// --- per-wiki orchestration -------------------------------------------------

const projectName = (wikiDir) => {
  const parts = wikiDir.split("/");
  const idx = parts.lastIndexOf(".claude");
  return idx > 0 ? parts[idx - 1] : wikiDir;
};

const lintWiki = (wikiDir) => {
  const { vocab, hasSchema } = readSchemaVocab(wikiDir);
  const pages = listMarkdownPages(wikiDir);
  const violations = pages.flatMap((page) => lintPage(wikiDir, page, vocab));
  const enforced = FIELDS.filter((f) => Boolean(vocab[f]));
  const notEnforced = FIELDS.filter((f) => !vocab[f]);
  return {
    project: projectName(wikiDir),
    wikiDir,
    hasSchema,
    pagesScanned: pages.length,
    enforced,
    notEnforced,
    violations,
  };
};

// --- reporting --------------------------------------------------------------

const KIND_LABEL = {
  numeric: "numeric (declared categorical)",
  "case-variant": "case mismatch",
  annotated: "valid value + trailing annotation",
  freeform: "off-vocabulary",
};

const formatWiki = (result) => {
  const lines = [];
  lines.push(`── ${result.project} ──  (${result.pagesScanned} pages)`);
  if (!result.hasSchema) {
    lines.push("   [SKIP] no _schema.md found — cannot determine legal vocabulary");
    return lines.join("\n");
  }
  if (result.notEnforced.length > 0) {
    lines.push(
      `   [INFO] not enforced (no value set declared in _schema.md): ${result.notEnforced.join(", ")}`,
    );
  }
  if (result.violations.length === 0) {
    lines.push(
      result.enforced.length > 0
        ? `   [OK] 0 violations across enforced fields: ${result.enforced.join(", ")}`
        : "   [OK] nothing enforceable",
    );
    return lines.join("\n");
  }
  const byField = (field) => result.violations.filter((v) => v.field === field);
  for (const field of result.enforced) {
    const vs = byField(field);
    if (vs.length === 0) continue;
    lines.push(`   [WARN] ${field}: ${vs.length} violation(s)`);
    for (const v of vs) {
      lines.push(`      ${v.page}  →  "${v.value}"  [${KIND_LABEL[v.kind]}]`);
    }
  }
  return lines.join("\n");
};

const formatReport = (results) => {
  const totalViolations = results.reduce((n, r) => n + r.violations.length, 0);
  const totalPages = results.reduce((n, r) => n + r.pagesScanned, 0);
  const head = [
    "WIKI FRONTMATTER VOCABULARY LINT (flag-only — no auto-fix)",
    `Wikis scanned: ${results.length}   Pages: ${totalPages}   Violations: ${totalViolations}`,
    "",
  ];
  const body = results.map(formatWiki).join("\n\n");
  const foot = [
    "",
    "Note: violations are NOT auto-fixed. Normalizing a numeric confidence or a",
    "freeform status is a judgment call — review each and decide the correct value,",
    "or extend the field's declared vocabulary in that project's _schema.md.",
  ];
  return [...head, body, ...foot].join("\n");
};

// --- main -------------------------------------------------------------------

const main = () => {
  const { base, explicitDirs } = parseArgs(process.argv.slice(2));
  const wikiDirs = explicitDirs.length > 0 ? explicitDirs : discoverWikiDirs(base);
  if (wikiDirs.length === 0) {
    out("No `.claude/wiki` directories found.");
    return 0;
  }
  const results = wikiDirs.map(lintWiki);
  out(formatReport(results));
  const total = results.reduce((n, r) => n + r.violations.length, 0);
  return total > 0 ? 1 : 0;
};

try {
  process.exit(main());
} catch (err) {
  process.stderr.write(`frontmatter-vocab-lint error: ${err.message}\n`);
  process.exit(2);
}
