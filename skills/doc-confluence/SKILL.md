---
name: doc-confluence
description: Build, restructure, or maintain a project's documentation into a well-defined confluence — hub-and-spoke architecture where any agent finds any information in 1-2 hops. Three modes: init (new project), audit (restructure existing), health (maintenance scan). Health integrates into end-of-session sync.
---

# Doc Confluence — Documentation Architecture Skill

**Invoke:** `/doc-confluence [mode]`

```
/doc-confluence         → auto-detect: no docs → init, docs exist → health
/doc-confluence init    → new project bootstrap (creates all required files)
/doc-confluence audit   → full restructure of existing docs (interactive)
/doc-confluence health  → lightweight maintenance scan (run at session end)
```

---

## Core Principle: The Confluence Contract

Any agent — current session or future — must be able to find any piece of information in at most 2 hops from either `CLAUDE.md` or `docs/INDEX.md`. Everything else is cross-reference, not duplication.

**Three rules that never bend:**
1. Every piece of information has exactly ONE authoritative home
2. Everything else cross-references: `> See [doc §section](path) for details`
3. Zero content loss — archive instead of delete (`docs/archive/`)

---

## The 6-Tier Hierarchy (universal)

Apply to every project. Every document belongs to exactly one tier.

### Tier 1 — Auto-Loaded (size-budgeted)
Files the AI loads into every conversation automatically. **Indexes only — no content dumps.**
- `CLAUDE.md` — tech stack, structure, routing, conventions, env vars (≤ 20KB)
- `.claude/rules/*.md` — behavioral rules: coding style, workflow, testing (≤ 3KB each)
- `memory/MEMORY.md` — cross-session memory index (auto-loaded via .claude/projects/)

### Tier 2 — Core Reference
Read at session start. Skimmable in under 5 minutes each.
- `SKILLS.md` — design system, schemas, algorithms, domain knowledge
- `DECISIONS.md` — *why* decisions were made, not what was built
- `ROADMAP.md` — feature index only (→ `roadmap/` sub-files for detail)
- `docs/INDEX.md` — master navigator: every doc linked by topic *(required)*

### Tier 3 — Domain Docs (`docs/`)
Organized by domain, not chronology.

```
docs/
  INDEX.md              ← REQUIRED: master navigator, all topics linked
  archive/              ← REQUIRED: historical/one-time docs (read-rarely)
  [project-type modules — see below]
```

### Tier 4 — Roadmap Sub-files (`roadmap/`)
```
roadmap/
  phases/     ← one file per sprint or phase
  archive/    ← completed phases
  reference/  ← definitions, scoring criteria
```

### Tier 5 — Lessons (`tasks/lessons/`)
```
tasks/
  lessons.md            ← CATEGORIZED INDEX ONLY — no lesson content inline
  lessons/
    [category].md       ← one file per domain (coding, testing, process, etc.)
```
**Rule:** Lessons index (`lessons.md`) contains one-line summaries + links. Full lessons go in sub-files. Health check enforces this.

### Tier 6 — Memory (`memory/`) — optional, if you run a cross-session memory system
```
memory/
  MEMORY.md             ← index (auto-loaded)
  sessions/             ← per-session summaries
  *.md                  ← typed memories: user, feedback, project, reference
```

---

## Document Ownership Table (required in CLAUDE.md)

Every project must have this table. Every piece of information has one owner.

```markdown
| Document | Owns |
|----------|------|
| CLAUDE.md | Tech stack, structure, conventions, test totals |
| DECISIONS.md | Architectural decisions log (why, not what) |
| SKILLS.md | Domain knowledge, schemas, algorithms |
| ROADMAP.md | Feature list index, progress tracking |
| docs/INDEX.md | Master navigator — every doc linked by topic |
| docs/testing.md | Test index: run commands, stats, links to sub-files |
```

Add project-specific rows as needed. If you can't fill this table cleanly — two documents claim the same thing — that's a duplication problem to fix.

---

## Project-Type Modules

After the universal core, add the modules that match the project type. Detect type by reading `package.json`, `Cargo.toml`, `pyproject.toml`, `go.mod`, or asking the user.

### Web / Mobile App
```
docs/
  design.md             ← UX/UI authority: must-do rules, mustn't-do rules, decisions log
  council.md            ← governance: agents/stakeholders, decision authority, review process
  testing.md            ← test index with run commands + stats
  architecture/         ← analytics, performance, infra, auth design
  reference/            ← API contracts, external service integrations
  launch/               ← launch plan, GTM, pricing
  compliance/           ← GDPR, privacy, regional consent (if applicable)
```

### API Backend
```
docs/
  api-contracts.md      ← endpoint specs, request/response shapes
  architecture/         ← system design, data flow, DB schema
  testing.md            ← test index
  operations/           ← deployment, monitoring, incident runbooks
  reference/            ← external service integrations, auth flows
```

### Content / Blog Site
```
docs/
  content-strategy.md   ← editorial guidelines, voice, topic clusters
  seo.md                ← keyword strategy, technical SEO rules
  operations/           ← publishing workflow, content calendar
  reference/            ← analytics, distribution channels
```

### CLI Tool / Library
```
docs/
  commands.md           ← full command reference with examples
  testing.md            ← test index
  architecture/         ← design decisions, extension points
  reference/            ← configuration options, environment vars
```

### Multi-Product / Monorepo
Detect: multiple `package.json` / app directories at root.
```
docs/
  INDEX.md              ← root navigator → per-product docs
  shared/               ← cross-product decisions, shared infra
  [product-a]/          ← product-specific docs (same structure as single-product)
  [product-b]/
```

---

## Agent Council Module (any project using AI agents)

Every project that uses AI agents should define its council in `docs/council.md`. This is the document that tells agents who the domain experts are, what they decide, and how to invoke a review.

### council.md structure

```markdown
# [Project] Agent Council

## Members

| Agent | Specialty | Decision Authority | Invoked When |
|-------|-----------|-------------------|--------------|
| [Name] | [Domain] | [What they decide] | [Trigger] |

## Governance Rules
1. [Rule about how decisions are made]
2. [Rule about overrides and escalation]

## How to Run a Review
1. State the proposal clearly
2. Each member responds in their area
3. Conflicts resolved by [CEO / lead / specified rule]
4. Decision recorded in DECISIONS.md

## When to Invoke
| Situation | Council member(s) |
|-----------|------------------|
| [Trigger] | [Who to ask] |
```

### Defining agent personas

Each agent in the council should have documented in their section:
- **Name and role** — what they specialize in
- **Knowledge base** — which docs/sections they are authority on
- **Tools** — what they can and can't do
- **Perspective** — how they frame problems (cost-focused, user-focused, security-focused, etc.)
- **Decision authority** — what they can approve vs. what needs escalation

Example:
> CEO Agent: final authority, business/user tradeoffs, frames all decisions through "will users love this?"
> Plant Intelligence: botanical accuracy, care science, physics engine correctness
> Security Agent: auth flows, data handling, GDPR compliance

Adapt roles to your domain. A fintech app might have: Compliance Agent, Risk Agent, UX Agent. A content platform: Editorial Agent, SEO Agent, Distribution Agent.

---

## Mode: `init` — New Project Bootstrap

Run when starting a project. Creates all required files as stubs with correct structure.

### Step 1: Detect project type
```bash
ls package.json Cargo.toml pyproject.toml go.mod 2>/dev/null
# Count app directories to detect monorepo
ls -d */ | grep -E "apps?|packages?|services?" | wc -l
```

### Step 2: Create universal core files

**CLAUDE.md stub** (if not exists — never overwrite existing):
```markdown
# CLAUDE.md — [Project Name]

## Project Overview
[1-2 sentences]

## Tech Stack
| Layer | Technology | Version |

## Project Structure
[src tree]

## Document Ownership
| Document | Owns |
|----------|------|
| CLAUDE.md | Tech stack, structure, conventions |
| DECISIONS.md | Architectural decisions |
| docs/INDEX.md | Master navigator |

## Key Reference Documents
| Document | Purpose |
```

**DECISIONS.md stub:**
```markdown
# Architectural Decisions

## Format
\`\`\`
## [YYYY-MM-DD] Short Title
**Context:** Why this decision was needed
**Decision:** What was chosen
**Alternatives:** What was rejected and why
**Consequences:** Impact going forward
\`\`\`

---
<!-- First decision goes here -->
```

**docs/INDEX.md stub:**
```markdown
# [Project] Documentation Index

## Quick Start
- [CLAUDE.md](../CLAUDE.md) — tech stack, conventions (auto-loaded)
- [DECISIONS.md](../DECISIONS.md) — architectural decisions log

## [Group by topic as files are created]
```

### Step 3: Create project-type module files
Based on detected type, create the appropriate stubs (design.md, testing.md, api-contracts.md, etc.).

### Step 4: Create lessons structure
```bash
mkdir -p tasks/lessons docs/archive memory/sessions
touch tasks/lessons.md  # index only
# Create category sub-files based on project type
```

### Step 5: Update CLAUDE.md ownership table
Fill in every file just created with its ownership domain.

---

## Mode: `audit` — Existing Project Restructure

**Interactive — requires user confirmation before destructive moves.**

### Step 0: Audit first, touch nothing

```bash
# Map every markdown file with line counts
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" \
  | xargs wc -l 2>/dev/null | sort -rn | head -30

# Total docs size
find . -name "*.md" -not -path "*/node_modules/*" | xargs wc -c | tail -1

# CLAUDE.md budget check
wc -c CLAUDE.md

# Find files that reference non-existent paths
grep -r "\[.*\](.*\.md" docs/ --include="*.md" -h 2>/dev/null \
  | grep -o '([^)]*\.md[^)]*)' | tr -d '()' | sort -u
```

Build the audit table before proceeding:
```
| File | Lines | Problem | Tier | Action |
|------|-------|---------|------|--------|
| SKILLS.md | 1847 | 6 unrelated domains | 2 | Split into sub-files |
| ROADMAP.md | 3361 | Inline feature specs | 2 | Extract → roadmap/ |
```

Confidence gate: Do NOT proceed until every file over 200 lines has been read and assigned to a tier and action.

### Step 1: Plan the restructure

Map every existing document to its target location in the new structure. Identify:
- Files to split (over 600 lines with multiple distinct sections)
- Files to move (wrong tier or directory)
- Files to archive (one-time, historical, no longer referenced)
- Files to create (required files that don't exist)
- Files to delete (truly duplicated — archive first, confirm with user)

### Step 2: Extract bloated files

For any file over 600 lines with multiple domains:
1. Identify each section's natural home in the tier structure
2. Create the sub-file
3. Replace the section in the parent with a 2-3 line summary + cross-reference link
4. Word-count check: `wc -w original.md` vs sum of extracted files — no content lost

### Step 3: Move files with git mv

```bash
# ALWAYS git mv — never plain mv (preserves blame and history)
git mv docs/old-path/file.md docs/new-path/file.md
```

### Step 4: Create docs/INDEX.md

Every document, grouped by topic. Agents navigate via this file.

```markdown
# Project Documentation Index

## Quick Start
- [CLAUDE.md](../CLAUDE.md) — tech stack, conventions (auto-loaded)

## Domain Docs
- [Design & UX](design.md) — rules, decisions, component reference
- [Testing](testing.md) — run commands, stats, coverage

## By Topic
### Authentication
...
### Data Layer
...
```

### Step 5: Repair all cross-references

After any restructure, broken links are guaranteed. Find and fix all of them.

```bash
# Find all links in all markdown files
grep -rn "\[.*\](.*\.md" . --include="*.md" | grep -v "node_modules\|\.git"

# Verify a specific path resolves
ls docs/architecture/analytics.md

# Find stale references to old paths (run for each moved file)
grep -rn "old/path/filename" . --include="*.md"
```

Fix every broken reference. Health check will catch any you miss.

### Step 6: Update CLAUDE.md

- Document Ownership table: accurate file paths
- Key Reference Documents table: accurate paths
- "What to Consult Before Making Changes" table (if applicable)
- Test counts: verify against actual test output, not memory
- Size check: `wc -c CLAUDE.md` — must be under project budget

### Step 7: Run health check
`/doc-confluence health` — fix all red flags before declaring done.

---

## Mode: `health` — Maintenance Scan

**Run at every session end as part of the mandatory end-of-session sync.**

Structural checks only. No running test suites. Completes in < 30 seconds.

### The 8 Checks

**Check 1: Required files exist**
```bash
for f in CLAUDE.md DECISIONS.md docs/INDEX.md; do
  [ -f "$f" ] && echo "✓ $f" || echo "✗ MISSING: $f"
done
```

**Check 2: Auto-load budget**
```bash
echo "CLAUDE.md: $(wc -c < CLAUDE.md) bytes (budget: 20480)"
# Global rules (adjust path if not using Claude Code)
find ~/.claude/rules -name "*.md" 2>/dev/null | while read f; do
  size=$(wc -c < "$f")
  [ "$size" -gt 3072 ] && echo "⚠ OVER BUDGET ($size bytes): $f" || echo "✓ $f ($size bytes)"
done
```

**Check 3: Bloat detection**
```bash
# Excludes: worktrees, archive (allowed to be long), node_modules, git
find . -name "*.md" \
  -not -path "*/node_modules/*" \
  -not -path "*/.git/*" \
  -not -path "*/.claude/worktrees/*" \
  -not -path "*/docs/archive/*" \
  | xargs wc -l 2>/dev/null | sort -rn | grep -v "total" \
  | awk '$1 > 800 {print "⚠ BLOAT ("$1" lines): "$2}'
```

**Check 4: Orphaned docs**
```bash
# A doc is orphaned if NO other markdown file references it
# Searches all .md files, not just INDEX.md (sub-docs can link to sub-docs)
find docs -name "*.md" -not -path "*/archive/*" -not -name "INDEX.md" | while read f; do
  stem=$(basename "$f" .md)
  if find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" \
       -not -path "*/.claude/worktrees/*" -not -name "$(basename $f)" \
       | xargs grep -qF "$stem" 2>/dev/null; then
    echo "✓ $f"
  else
    echo "⚠ ORPHAN: $f"
  fi
done
```

**Check 5: Broken cross-references**
```bash
# Extract relative markdown links and verify each resolves from its source file's dir
grep -rno --include="*.md" -E '\[[^]]+\]\([^)]+\)' docs/ 2>/dev/null \
  | grep -v '](http' \
  | sed -E 's/^([^:]+):[0-9]+:.*\(([^)]+)\)/\1 \2/' \
  | while read src link; do
      case "$link" in \#*) continue;; esac
      [ -f "$(dirname "$src")/${link%%#*}" ] || echo "⚠ BROKEN: $src → $link"
    done
```

**Check 6: Lessons written to index (not sub-files)**
```bash
lines=$(wc -l < tasks/lessons.md 2>/dev/null || echo 0)
echo "tasks/lessons.md: $lines lines"
[ "$lines" -gt 150 ] && echo "⚠ Over 150 lines — lesson content may be leaking into the index" || echo "✓ Index is concise"
```

**Check 7: Test count cross-check**
```bash
echo "=== Primary test count ==="
grep -oE "[0-9,]+ unit" CLAUDE.md | head -1 | sed 's/^/CLAUDE.md: /'
grep -oE "[0-9,]+ (unit|tests)" docs/testing.md | head -1 | sed 's/^/testing.md: /'
# Flag if the leading numbers differ
```

**Check 8: Session handoff currency**
```bash
if [ -f tasks/session-handoff.md ]; then
  today=$(date +%Y-%m-%d)
  handoff_date=$(grep -oE "[0-9]{4}-[0-9]{2}-[0-9]{2}" tasks/session-handoff.md | head -1)
  [ "$handoff_date" = "$today" ] \
    && echo "✓ Session handoff current ($today)" \
    || echo "⚠ STALE: session-handoff.md last updated $handoff_date (today: $today)"
else
  echo "– no session-handoff.md (optional convention) — skipped"
fi
```

### Health Scorecard Output Format

```
## Doc Confluence Health — [YYYY-MM-DD]

✓ Required files present (3/3)
✓ CLAUDE.md under budget (14.2KB / 20KB)
⚠ Bloat: docs/reference/n8n-workflows.md is 923 lines — consider splitting
✓ No orphaned docs
✗ Broken link: docs/architecture/analytics.md → ../reference/old-path.md (not found)
✓ Lessons index is clean (87 lines)
⚠ Test count mismatch: CLAUDE.md says 2091, docs/testing.md says 2,141
✓ Session handoff current

Score: 5/8 — 2 warnings, 1 error
Action required: Fix broken link + update test count in CLAUDE.md
```

### Integration with End-of-Session Sync (CAPTURE) — optional

**This section is an integration example from the author's workflow.** It assumes conventions that may not exist in your setup: a `/ship` gated-push command, a `/save-session` command, `tasks/session-handoff.md`, and a `memory/` directory. Run the steps whose artifacts exist in your project and skip the rest — the core doc-confluence methodology above does not depend on any of them.

**Trigger:** Any time the user says "save and sync," "wrap up," "end of session," or similar — treat it as a full context window closure. Run the complete checklist below every time. Never split "save and sync" from "context window closing" — they are the same thing.

**CAPTURE ≠ SHIP.** Save and sync is capture only — it never pushes code to main. Code goes to main only via `/ship` (explicit, gated). Docs push immediately (always safe).

Run in this order:

```
0. Orient — git branch --show-current + git status --short
   → confirm which branch you're on before doing anything
   → if branch in session-handoff §3 doesn't match: flag mismatch, ask user before continuing

1. npx vitest run
   → flag failures prominently (don't block capture, but note clearly)
   → update CLAUDE.md test count if changed

2. git status --short first, then git commit locally
   → show what will be committed BEFORE committing
   → commit docs and code as SEPARATE commits (docs first), so the docs commit can push alone
   → skip files that look unintentional (.env.local, temp files, etc.) — ask if unsure

3. Push the docs-only commit(s) to remote immediately
   → stage doc changes explicitly (a bare `git add *.md` misses docs in subdirectories)
   → push ONLY if everything being pushed is doc-only; any commit containing code stays local for the gated ship path

4. If on feature branch → push branch to remote
   → git push origin [branch-name] (safe remote backup, not main)
   → if on main → skip this step

5. /doc-confluence health → fix all red flags

6. Write session memory → memory/sessions/sessions-YYYY-MM-DD.md + MEMORY.md

7. Update CLAUDE.md test count if changed (if not done in step 1)

8. Update session-handoff
   → §3: current branch, last commit hash, test count, gates passed this session
   → §4: add today's session entry
   → §5: update primary task for next session

9. /save-session → session narrative to ~/.claude/session-data/ (optional — skip if you don't run a session-capture command)

10. Gate status report (based on what actually ran this session)
```

**Gate status report format (step 10):**
```
## Capture Complete — Gate Status for /ship

✅ Vitest: 2,091 tests passing       ← from step 1
⬜ Code review: not run this session  ← always honest — don't assume
⬜ Regression: not run this session
⬜ UAT: not assessed

Code committed locally. Docs pushed.
Run /ship when ready to push code to GitHub (main = production).
```

Never push code automatically. Always wait for explicit `/ship`.

---

## What to Never Do

- **Never `mv` a file — always `git mv`** (preserves blame and history)
- **Never duplicate content** — cross-reference instead
- **Never delete — archive** (`docs/archive/YYYY-MM-filename.md`)
- **Never write lesson content in the index file** — sub-files only
- **Never restructure content (what docs SAY)** without user confirmation — moving and splitting is safe; changing meaning requires approval
- **Never skip the audit phase** in `audit` mode — reading before touching is mandatory
- **Never declare health "done"** with red flags outstanding
- **Never let CLAUDE.md grow past its budget** — extract to Tier 3 docs instead

---

## Quick Reference Checklists

### New Project (`init`)
- [ ] Project type detected
- [ ] CLAUDE.md created with ownership table
- [ ] DECISIONS.md created at root
- [ ] docs/INDEX.md created as master navigator
- [ ] docs/archive/ directory exists
- [ ] tasks/lessons.md created as index (+ sub-file stubs)
- [ ] memory/MEMORY.md exists
- [ ] Project-type module files created (design.md, testing.md, etc.)
- [ ] Agent council created if project uses AI agents (docs/council.md)

### Existing Project Restructure (`audit`)
- [ ] Audit table written before any changes
- [ ] Every file over 200 lines read and assigned
- [ ] All files over 800 lines split into sub-files
- [ ] git mv used for all relocations
- [ ] docs/INDEX.md created or updated
- [ ] CLAUDE.md ownership table reflects new structure
- [ ] All cross-references repaired
- [ ] Health check passes (0 errors, 0 warnings)
- [ ] Git commit made with all changes
- [ ] No content lost

### Session End (`health`)
- [ ] All 8 health checks pass (or red flags documented)
- [ ] Broken links fixed
- [ ] Test count in CLAUDE.md matches docs/testing.md
- [ ] Bloat warnings actioned or deferred (note why)
- [ ] Orphaned docs linked or archived
- [ ] Session handoff updated with today's date
