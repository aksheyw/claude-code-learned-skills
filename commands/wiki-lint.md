---
description: Audit the project wiki for staleness, contradictions, and quality issues
allowed-tools: Read, Grep, Glob, Bash
---

Audit the project wiki for quality issues. Follow the lint operation from `~/.claude/skills/llm-wiki/references/operations.md`.

## Steps

1. **Verify wiki exists**
   - If `wiki/` does not exist but `.claude/wiki/` does, the wiki is in its old location: say so, offer to move it with `mv .claude/wiki wiki`, and stop.
   - If neither exists: "No wiki found. Use `/wiki-init` to set one up."
   - If `wiki/` exists but has no `_index.md` (for example a two-file notebook of `_hot.md` and `_log.md`), say so and offer to run `/wiki-init`. It adds only the missing files and leaves the existing ones untouched. Do not continue until `_index.md` exists.

2. **Scan all pages**
   - Read `wiki/_index.md` for the page catalog
   - Glob `wiki/**/*.md` to find all pages, including category subfolders (and any not in the index)
   - Read each page

3. **Run all checks**

   **CRITICAL — Contradictions:**
   - Compare wiki pages against each other for conflicting claims
   - Compare wiki pages against CLAUDE.md (if exists)
   - Compare wiki pages against docs/ key files (if they exist)
   - Compare wiki pages against DECISIONS.md (if exists)

   **WARNING — Staleness:**
   - Flag pages not updated in 30+ days that contain time-sensitive content (API versions, library versions, config values, URLs)

   **INFO — Orphans:**
   - Pages in `wiki/` not listed in `_index.md`

   **INFO — Missing cross-references:**
   - Pages that mention topics covered by other wiki pages but don't link to them

   **INFO — Oversized:**
   - Topic pages exceeding 150 lines — suggest splitting. Skip `_`-prefixed files (`_index.md` may run to 200 lines)

   **INFO — Empty:**
   - Pages with only the template header, no actual content

   **Check 7 — Frontmatter vocabulary (deterministic):**
   - Run `node ~/.claude/skills/llm-wiki/scripts/frontmatter-vocab-lint.mjs` from the project root and fold its findings into the report (it validates `status`/`confidence` values against the vocabulary declared in `_schema.md`)
   - If `node --version` fails because Node.js is not installed, skip this check and report it as `Check 7 skipped: Node.js not installed`. Run the other checks as normal. Do not install Node yourself, and do not eyeball the check instead.

4. **Output report**
   ```
   WIKI LINT REPORT — [project name]
   Date: [date]
   Pages scanned: [N]

   ISSUES FOUND: [N]

   [CRITICAL] ...
   [WARNING] ...
   [INFO] ...

   SUGGESTED FIXES:
   1. ...
   2. ...
   ```

## Rules
- Don't auto-fix — report issues and let user decide
- Contradictions are always CRITICAL priority
- Can be combined with `/loop` for periodic maintenance
