---
description: Initialize a project wiki for persistent knowledge capture across sessions
allowed-tools: Read, Write, Glob
---

Set up an LLMwiki for the current project. This creates a `.claude/wiki/` directory that persists project knowledge across Claude Code sessions.

## Steps

1. **Check prerequisites**
   - Verify `.claude/wiki/` doesn't already exist (if it does, report current state instead)
   - Read CLAUDE.md to detect project type, name, and tech stack

2. **Create wiki directory and files**

   Create `.claude/wiki/_index.md`:
   ```markdown
   # [Project Name] Wiki

   **Created:** [today's date]
   **Purpose:** Persistent project knowledge that compounds across sessions.

   ## Pages

   (No pages yet. Use `/wiki-ingest` to add knowledge.)
   ```

   Create `.claude/wiki/_log.md`:
   ```markdown
   # Wiki Changelog

   | Date | Operation | Pages Affected | Source |
   |---|---|---|---|
   | [today] | init | _index.md, _log.md, _schema.md | /wiki-init |
   ```

   Create `.claude/wiki/_schema.md` by reading `~/.claude/skills/llm-wiki/references/schema-template.md` and customizing for this project's type.

3. **Offer initial ingest**
   - Scan `docs/` for key files — list what could be ingested
   - If you keep session narratives (e.g. in `~/.claude/session-data/`), check for recent files matching this project
   - Ask: "Would you like me to ingest any of these sources now?"

4. **Report**
   ```
   Wiki initialized at .claude/wiki/
   - _index.md (topic catalog)
   - _log.md (change audit trail)
   - _schema.md (topic categories for [project type])

   Next: Use /wiki-ingest to start capturing knowledge.
   ```
