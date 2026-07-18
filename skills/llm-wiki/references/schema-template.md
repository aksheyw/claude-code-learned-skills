# Wiki Schema — [Project Name]

**Created:** [date]
**Project Type:** [auto-detected from CLAUDE.md]

## Topic Categories

Organize wiki pages into these categories. Adjust based on project needs.

### Architecture
System design, data flow, key patterns, tech stack decisions.

### APIs
External service integrations, rate limits, auth patterns, endpoint docs.

### Gotchas
Non-obvious bugs, workarounds, things that break unexpectedly, environment-specific issues.

### Decisions
Why we chose X over Y. Complements DECISIONS.md with deeper context and alternatives explored.

### Patterns
Recurring code patterns, naming conventions, file organization rules, component templates.

### Dependencies
Library versions, upgrade notes, compatibility issues, migration paths.

### Operations
Deployment procedures, environment setup, CI/CD quirks, monitoring alerts.

---

## Naming Conventions

- Use lowercase-kebab-case for page names: `api-integrations.md`, `auth-patterns.md`
- Prefix with category if ambiguous: `gotcha-firebase-auth.md`, `decision-state-management.md`
- Keep names short (max 3 words)

## Cross-Reference Format (Obsidian-compatible)

Within wiki pages, ALWAYS use Obsidian-style `[[double-bracket]]` wiki links:
- Internal wiki page: `[[api-integrations]]`
- With display text: `[[api-integrations|external APIs]]`
- Link to a section: `[[api-integrations#rate-limits]]`
- External file (docs/, CLAUDE.md): standard markdown `[text](path/to/file.md)`

Why: `[[...]]` creates graph edges in Obsidian. Standard markdown links don't. Using this format means the wiki renders correctly in Claude Code AND shows up as a connected graph in Obsidian's graph view.

## Frontmatter Convention (YAML on every page)

Every wiki page MUST start with YAML frontmatter:

```yaml
---
created: YYYY-MM-DD
updated: YYYY-MM-DD
source: [where knowledge came from]
tags: [category, subcategory, tech-stack-tag]
aliases: [alternate names for this topic]
---
```

Tags follow a `#category/subcategory` hierarchy in Obsidian. Example tags for an example app's wiki page:
- `#architecture/frontend`
- `#api/openweather`
- `#gotcha/capacitor`
- `#decision/monetization`

## Obsidian Viewing Setup

To view the wiki in Obsidian:
1. Open Obsidian → File → Open folder as vault
2. Select `.claude/wiki/` directory
3. Enable Graph View (left sidebar) to see the knowledge graph
4. Optional plugins: Dataview (for querying frontmatter), Tag Wrangler (tag hierarchy)
