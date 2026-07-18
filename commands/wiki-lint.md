---
description: Audit the project wiki for staleness, contradictions, and quality issues
allowed-tools: Read, Grep, Glob, Bash
---

Audit the project wiki for quality issues. Follow the lint operation from `~/.claude/skills/llm-wiki/references/operations.md`.

## Steps

1. **Verify wiki exists**
   - Check `.claude/wiki/_index.md` exists. If not: "No wiki found. Use `/wiki-init` to set one up."

2. **Scan all pages**
   - Read `.claude/wiki/_index.md` for the page catalog
   - Glob `.claude/wiki/**/*.md` to find all pages, including category subfolders (and any not in the index)
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
   - Pages in `.claude/wiki/` not listed in `_index.md`

   **INFO — Missing cross-references:**
   - Pages that mention topics covered by other wiki pages but don't link to them

   **INFO — Oversized:**
   - Pages exceeding 150 lines — suggest splitting

   **INFO — Empty:**
   - Pages with only the template header, no actual content

   **Check 7 — Frontmatter vocabulary (deterministic):**
   - Run `node ~/.claude/skills/llm-wiki/scripts/frontmatter-vocab-lint.mjs` from the project root and fold its findings into the report (it validates `status`/`confidence` values against the vocabulary declared in `_schema.md`)

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
