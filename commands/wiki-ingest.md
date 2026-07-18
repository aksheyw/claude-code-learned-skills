---
description: Capture learnings into the project wiki
argument-hint: [optional: path to source file, URL, or leave blank for interactive]
allowed-tools: Read, Write, Edit, Grep, Glob
---

Capture durable knowledge into the project wiki. Follow the ingest operation from `~/.claude/skills/llm-wiki/references/operations.md`.

## Steps

1. **Verify wiki exists**
   - Check `.claude/wiki/_index.md` exists. If not, suggest running `/wiki-init` first.

2. **Get source material**
   - If argument provided: read the file or fetch the URL
   - If no argument: ask "What should I capture?" and use the response as source material

3. **Extract learnings**
   - Identify 3-5 distinct, durable learnings (facts, decisions, patterns, gotchas)
   - Each learning must have: what, why it matters, when it was learned

4. **File into wiki pages**
   - Read `.claude/wiki/_index.md` to check existing pages
   - For each learning:
     - If a relevant page exists: read it, merge the new info (never duplicate), update "Last Updated"
     - If no relevant page: create a new page using the template from operations.md
   - Add cross-references to related pages and external docs

5. **Update index and log**
   - Update `.claude/wiki/_index.md` with any new pages
   - Append entry to `.claude/wiki/_log.md`

6. **Report**
   ```
   Ingested [N] learnings:
   - [learning 1] → [page.md] (created/updated)
   - [learning 2] → [page.md] (created/updated)
   - [learning 3] → [page.md] (created/updated)
   ```

## Rules
- Never duplicate content — always merge into existing pages
- Every fact needs a date and source citation
- Keep pages under 150 lines — split if longer
- Don't create pages that duplicate docs/ content — reference docs/ instead
