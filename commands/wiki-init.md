---
description: Initialize a project wiki for persistent knowledge capture across sessions
allowed-tools: Read, Write, Edit, Glob
---

Set up an LLMwiki for the current project. This creates a `wiki/` directory that persists project knowledge across Claude Code sessions.

## Steps

1. **Check prerequisites**
   - If `wiki/` does not exist but `.claude/wiki/` does, the wiki is in its old location: say so, offer to move it with `mv .claude/wiki wiki`, and stop.
   - If neither exists, create `wiki/`.
   - If it exists, check `_index.md`, `_log.md` and `_schema.md` one at a time. Step 2 creates only the missing ones. Never overwrite or reformat a file that is already there, including a `_hot.md` or `_log.md` kept as a simple two-file notebook. If all three exist, report current state and stop.
   - Read CLAUDE.md to detect project type, name, and tech stack

2. **Create the missing files**

   Create `wiki/_index.md`:
   ```markdown
   # [Project Name] Wiki

   **Created:** [today's date]
   **Purpose:** Persistent project knowledge that compounds across sessions.

   ## Pages

   (No pages yet. Use `/wiki-ingest` to add knowledge.)
   ```

   If the folder already holds pages (for example `_hot.md`), list each one under Pages with a one-line description instead of the "No pages yet" line, so `/wiki-lint` does not report them as orphans.

   Create `wiki/_log.md`:
   ```markdown
   # Wiki Changelog

   | Date | Operation | Pages Affected | Source |
   |---|---|---|---|
   | [today] | init | _index.md, _log.md, _schema.md | /wiki-init |
   ```

   If `_log.md` already exists, do not create it. Add one init entry to it in the format and order the file already uses.

   Create `wiki/_schema.md` by reading `~/.claude/skills/llm-wiki/references/schema-template.md` and customizing for this project's type.

3. **Offer initial ingest**
   - Scan `docs/` for key files — list what could be ingested
   - If you keep session narratives (e.g. in `~/.claude/session-data/`), check for recent files matching this project
   - Ask: "Would you like me to ingest any of these sources now?"

4. **Report**
   ```
   Wiki initialized at wiki/
   - _index.md (topic catalog)            [created / already there]
   - _log.md (change audit trail)         [created / already there]
   - _schema.md (topic categories for [project type])  [created / already there]

   Next: Use /wiki-ingest to start capturing knowledge.
   ```
