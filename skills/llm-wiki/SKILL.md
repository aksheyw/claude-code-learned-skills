---
name: llm-wiki
description: Persistent project wiki that compounds knowledge across sessions. Ingest learnings, query past decisions, lint for contradictions. Based on Karpathy's LLMwiki pattern.
allowed-tools: Read, Write, Edit, Grep, Glob
---

# LLMwiki — Persistent Project Knowledge Wiki

A file-based wiki system that captures durable project knowledge across Claude Code sessions. Instead of re-deriving context from raw session files each time, the wiki maintains structured, searchable, cross-referenced markdown pages that compound over time.

## When to Use

- **After fixing a non-obvious bug** — capture the root cause so future sessions don't re-investigate
- **After making an architectural decision** — record the reasoning, not just the choice
- **After a session with significant learnings** — extract the 3-5 durable insights before they're buried in session data
- **When starting a new session** — query the wiki instead of re-reading 30MB of `.jsonl` files
- **Periodically** — lint the wiki to catch contradictions with current code/docs

## Commands

| Command | Purpose |
|---|---|
| `/wiki-init` | Set up `.claude/wiki/` in current project |
| `/wiki-ingest [source]` | Capture learnings into wiki pages |
| `/wiki-query <question>` | Search wiki and synthesize an answer |
| `/wiki-lint` | Audit wiki for staleness, contradictions, orphans |

## Wiki Structure (per project)

```
<project-root>/.claude/wiki/
  _index.md      # Topic catalog (the brain — kept under 200 lines)
  _log.md        # Chronological audit trail of all changes
  _schema.md     # Project-specific topic categories
  <topic>.md     # Individual knowledge pages
```

## How It Complements Existing Systems

The systems named below are examples from the author's setup, not dependencies of this skill — the point is where a wiki fits among whatever learning/memory systems you run:

| System | Scope | LLMwiki Relationship |
|---|---|---|
| Instinct/lesson capture (e.g. continuous-learning loops) | Atomic instincts (trigger→action) | Wiki stores the *reasoning* behind instincts |
| Session narratives (e.g. save-session / resume-session commands) | Full session narratives | Wiki *ingests from* sessions, extracts durable facts |
| MEMORY.md | Cross-project strategic decisions | Wiki handles *project-specific* knowledge |
| docs/ (INDEX.md) | Designed architecture docs | Wiki handles *emergent* knowledge discovered during work |

## Key Principles

1. **Never duplicate** — always merge new information into existing pages
2. **Cross-reference with Obsidian-style `[[links]]`** — every page uses `[[page-name]]` syntax so the wiki renders as a graph in Obsidian
3. **YAML frontmatter on every page** — `created`, `updated`, `source`, `tags`, `aliases` (enables Obsidian queries and filtering)
4. **Date everything** — each fact includes when it was learned
5. **Source everything** — cite the session, file, or conversation where knowledge came from
6. **Keep _index.md lean** — one line per topic, max 200 lines. If it grows beyond that, reorganize into sub-topics.
7. **Manual ingest only** — the user/agent decides what's worth capturing. Auto-capture creates noise.
8. **Don't preload at session start** — use `/wiki-query` on demand to avoid context bloat.
9. **Obsidian-compatible** — the wiki should be openable as an Obsidian vault (File → Open folder as vault → `.claude/wiki/`) with graph view working out of the box.

## Operations Reference

See `references/operations.md` for detailed operation specs.
See `references/schema-template.md` for the default wiki schema.
