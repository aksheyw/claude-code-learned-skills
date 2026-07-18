# LLMwiki Operations Reference

## Operation 1: Ingest

**Purpose:** Capture durable knowledge from a source into the wiki.

### Input Sources
- **Interactive** (no argument): Claude asks "What should I capture?" — user describes the learning
- **Session file**: Path to a session-data file — Claude reads it, extracts 3-5 key learnings
- **Doc file**: Path to a docs/ file — Claude reads it, creates a wiki summary with cross-references
- **Free text**: User pastes text directly — Claude parses and files it
- **URL**: Claude fetches and extracts key information

### Process
1. Read the source material
2. Identify 3-5 distinct learnings (facts, decisions, patterns, gotchas)
3. For each learning:
   a. Check `_index.md` — does a relevant wiki page already exist?
   b. If YES: read the page, merge the new info (don't duplicate), update the "Last Updated" date
   c. If NO: create a new page with the standard page template (below)
4. Update `_index.md` with any new pages or changed descriptions
5. Append an entry to `_log.md` with: date, operation, pages affected, source
6. Report what was captured and where

### Page Template (Obsidian-compatible)
```markdown
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: [session file, conversation, docs, etc.]
tags: [category, subcategory]
aliases: [alternate names for this topic]
---

# [Topic Title]

## Summary
[2-3 sentence overview]

## Details
[Specific facts, decisions, patterns]

## Cross-References
- See also: [[related-wiki-page]]
- Related concept: [[another-page]]
- External: docs/architecture/file.md (full spec)
- Decision: DECISIONS.md §[date] [title]

## History
- YYYY-MM-DD: [what was added/changed and why] [source: [[session-page]]]
```

### Link Format (CRITICAL)

Use **Obsidian-style double-bracket wiki links** for all cross-references between wiki pages: `[[page-name]]`. This renders as a clickable link in both Claude Code markdown viewers and Obsidian's graph view.

- Internal wiki link: `[[api-integrations]]` (no .md extension, no path)
- Alias: `[[api-integrations|external APIs]]` (pipe syntax for display text)
- External reference (non-wiki): use standard `[text](path)` markdown links
- Heading link: `[[api-integrations#rate-limits]]`

**Why this matters:** Obsidian parses `[[...]]` as graph edges. Standard markdown links don't create graph connections. Using `[[...]]` makes the wiki navigable both as a CLI markdown file tree AND as a visual knowledge graph in Obsidian.

### Rules
- Max 150 lines per page. If longer, split into sub-topics.
- Every fact must have a date and source
- Never create a page that duplicates content in docs/ — instead, create a wiki page that REFERENCES the docs/ file with additional context

---

## Operation 2: Query

**Purpose:** Search the wiki and synthesize an answer to a question.

### Process
1. Read `_index.md` to find relevant pages (grep for keywords)
2. Read matching pages (up to 5 most relevant)
3. Synthesize an answer with citations: `[source: [[page-name]], learned YYYY-MM-DD]`
4. If the answer draws from multiple pages, cross-reference them
5. If the query reveals a knowledge gap:
   a. Note it in `_log.md` as "unanswered query"
   b. Suggest: "Would you like me to research this and add it to the wiki?"
6. If the synthesized answer is itself valuable, offer to file it as a new wiki page

### Citation Format
> "The climate API requires a 10s timeout for India regions [source: [[api-integrations]], learned 2026-04-16]"

Always cite wiki pages using Obsidian `[[...]]` syntax. Cite external files (docs/, CLAUDE.md, session files) using standard markdown link syntax or file path references.

### Rules
- Never answer from training data alone — always ground in wiki content
- If no wiki pages match, say so honestly: "No wiki entries found for this topic. Try /wiki-ingest to add knowledge."
- Don't read the entire wiki — use _index.md to target relevant pages

---

## Operation 3: Lint

**Purpose:** Audit the wiki for quality issues.

### Checks
1. **Contradictions**: Compare wiki pages against each other AND against CLAUDE.md, docs/, and DECISIONS.md. Flag any conflicts.
2. **Staleness**: Pages not updated in 30+ days with time-sensitive content (API versions, library versions, config values).
3. **Orphans**: Pages that exist in `.claude/wiki/` but aren't listed in `_index.md`.
4. **Missing cross-references**: Pages that mention topics covered by other pages but don't link to them.
5. **Oversized pages**: Any page exceeding 150 lines — suggest splitting.
6. **Empty pages**: Pages with only the template, no actual content.
7. **Frontmatter vocabulary** (deterministic): Enum fields (`confidence`, `status`) whose values fall outside the set declared in that project's `_schema.md`. Run the checker — do not eyeball it:
   ```bash
   node ~/.claude/skills/llm-wiki/scripts/frontmatter-vocab-lint.mjs
   ```
   It reads the legal value set from each `_schema.md` (never hardcoded), scans pages recursively, and classifies each violation (`numeric` / `case-variant` / `annotated` / `off-vocabulary`). Fields a schema declares but never enumerates are reported `not enforced`, never flagged. Flag-only — see Rules. Exit 0 clean / 1 violations / 2 error.

### Output Format
```
WIKI LINT REPORT — [project name]
Date: [date]
Pages scanned: [N]

ISSUES FOUND: [N]

[CRITICAL] Contradiction: [page1.md] says X but [CLAUDE.md] says Y
[WARNING] Stale: [page.md] last updated [date] — mentions [outdated info]
[INFO] Orphan: [page.md] not in _index.md
[INFO] Missing cross-ref: [page1.md] mentions [topic] — should link to [page2.md]

SUGGESTED FIXES:
1. [specific fix]
2. [specific fix]
```

### Rules
- Don't auto-fix — report issues and let user/agent decide
- Contradictions are CRITICAL — always surface them first
- Can be combined with `/loop` for periodic maintenance
- Check 7 is the only deterministic check — run its script for exact counts. Never auto-normalize its findings: numeric `90`→`high`, or whether `shipped` should become a legal `status`, is a judgment call (the fix may be to correct the value OR to extend the `_schema.md` vocabulary). Surface; let the user choose.

---

## Operation 4: Init

**Purpose:** Set up the wiki for a new project.

### Process
1. Create `.claude/wiki/` directory
2. Create `_schema.md` — auto-detect project type from CLAUDE.md and suggest topic categories
3. Create `_index.md` — empty catalog with header
4. Create `_log.md` — empty log with header
5. Offer to do an initial ingest:
   a. Scan docs/ for key files → create wiki summaries
   b. If the project keeps session narratives (e.g. session-data files), check recent ones → extract learnings
   c. Read DECISIONS.md → create decision-log wiki pages

### Default Schema Categories
- **Architecture**: System design, data flow, key patterns
- **APIs**: External service integrations, rate limits, auth patterns
- **Gotchas**: Non-obvious bugs, workarounds, things that break
- **Decisions**: Why we chose X over Y (complements DECISIONS.md with more context)
- **Patterns**: Recurring code patterns, naming conventions, file organization
- **Dependencies**: Library versions, upgrade notes, compatibility issues
