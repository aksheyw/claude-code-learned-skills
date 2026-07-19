# Claude Code Learned Skills: Captured From Real Sessions

> **Twelve skills extracted from actual debugging and research sessions: Docker / SSH / VPS ops, data & ML pipeline gotchas, model prompting field guides, systematic quality methodology, and a persistent project wiki.**

Most "Claude Code skills" you'll find online are written speculatively. Someone imagines a useful skill and writes it down. These are different: they were captured *after* I'd already debugged the bug (or run the experiments) once, refined into reusable methodology, and added to my Claude Code config so the same gotcha couldn't bite me twice.

## Why I built this

I run a continuous-learning loop on every Claude Code session: when a bug takes more than 20 minutes to figure out, the resolution gets distilled into a skill. After ~6 months of this, the skills became substantial enough that I wanted them findable + share-able.

This is the slice of that library that has generalized beyond my personal stack: Docker / SSH / VPS ops, two data/ML pipeline gotchas, four model prompting guides, two systematic-quality skills (a 10-category bug audit and a documentation architecture), and a persistent project wiki with its slash commands.

## What's in this repo

### Docker / SSH / VPS

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[docker-config-qa-regression](skills/docker-config-qa-regression/SKILL.md)** | 6-phase verification checklist after any docker-compose change | After modifying volumes, env vars, ports (before declaring "done") |
| **[docker-ephemeral-volume-fix](skills/docker-ephemeral-volume-fix/SKILL.md)** | Diagnose and fix "settings randomly reset" pattern (when app config writes to a non-mounted path) | When dashboard/UI changes don't persist across `docker compose down/up` |
| **[ssh-docker-remote-config-management](skills/ssh-docker-remote-config-management/SKILL.md)** | Avoid the SSH → docker exec → jq quoting nightmare using pipe-and-copy + SIGUSR1 hot-reload | Editing JSON configs inside containers on a remote VPS |

### Data & ML pipelines

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[huggingface-dataset-script-deprecation](skills/huggingface-dataset-script-deprecation/SKILL.md)** | Substitution workflow for legacy script-based HF datasets that `datasets` v4.x refuses to load | On `RuntimeError: Dataset scripts are no longer supported` |
| **[openai-compatible-embeddings-batching](skills/openai-compatible-embeddings-batching/SKILL.md)** | Transparent batching + defensive errors for embeddings adapters, because some providers return HTTP 200 error bodies with no `data` key | Building an adapter against any OpenAI-protocol embeddings endpoint (OpenRouter, vLLM, Together, self-hosted) |

### Model prompting field guides

A slightly different species from the rest: distilled from cited public sources (Anthropic's prompting guides, the Qwen model card + generation config + blog) plus my own testing, rather than from a single debugging session. Each carries its source URLs and a snapshot date, so if the snapshot is more than ~60 days old, re-fetch the source and reconcile before high-stakes use.

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[prompting-fable-5](skills/prompting-fable-5/SKILL.md)** | Reducing false-positive safety fallbacks on benign security/bio review work, plus effort levels, long-horizon scaffolding, subagents/memory | Benign security or bio review work that keeps bouncing to Opus 4.8, or general Fable-5 scaffolding |
| **[prompting-opus-4-8](skills/prompting-opus-4-8/SKILL.md)** | Thinking-off-by-default, effort tuning, literal instruction-following, the code-review recall harness effect, and the persistent cream/serif design default | Starting Opus 4.8 work, migrating from 4.7, or getting a cream+serif design you didn't ask for |
| **[prompting-sonnet-5](skills/prompting-sonnet-5/SKILL.md)** | The 4.6-migration API breakers (sampling params now 400-error, +30% tokenizer, thinking budgets removed), effort mapping, tool-use triggering | Migrating a Sonnet 4.6 prompt or API call, or picking Sonnet as a subagent model |
| **[prompting-qwen3-coder](skills/prompting-qwen3-coder/SKILL.md)** | Non-thinking model with no exposed thinking channel; official sampling params, tool calling as the documented path, and the measured "silent or flooding" failure signature | Wiring qwen3-coder into a local review seat, or debugging an empty/fabricating local model |

### Systematic quality

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[audit](skills/audit/SKILL.md)** | 10-category systemic bug finder: raw DB values in UI, API contract mismatches, database-rules gaps, CORS prod-domain misses, CSS purge, noopener, orphaned deletes, mobile misconfigs, perf, a11y (each with detection, the "ripple search" where one instance means many, and fix patterns + CI automation where applicable) | Code review, pre-deployment, E2E passes, or any "did we miss anything?" moment |
| **[doc-confluence](skills/doc-confluence/SKILL.md)** | Hub-and-spoke documentation architecture: any agent finds any information in 1-2 hops; init / audit / health modes; size budgets for auto-loaded files; one-authoritative-home rule | New project setup, CLAUDE.md bloat, docs that contradict each other |

### Knowledge & memory

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[llm-wiki](skills/llm-wiki/SKILL.md)** | Persistent project wiki that compounds knowledge across sessions: ingest learnings, query past decisions, lint for contradictions. Working implementation of Karpathy's LLMwiki pattern, proven across 6 projects (249 pages on the largest). Ships with 4 slash commands ([`/wiki-init`](commands/wiki-init.md), [`/wiki-ingest`](commands/wiki-ingest.md), [`/wiki-query`](commands/wiki-query.md), [`/wiki-lint`](commands/wiki-lint.md)) and a frontmatter-vocabulary linter script | Any project that outlives one session |

Each skill is a self-contained folder: `skills/<name>/SKILL.md` with frontmatter (`name:`, `description:`), the layout current Claude Code expects for skills.

## Install

```bash
git clone https://github.com/aksheyw/claude-code-learned-skills.git
cd claude-code-learned-skills

# Install all twelve at once (copy the skill folders)
mkdir -p ~/.claude/skills ~/.claude/commands
cp -r skills/*/ ~/.claude/skills/

# The llm-wiki slash commands
cp commands/*.md ~/.claude/commands/

# Or install just the one you need (copy its folder)
cp -r skills/ssh-docker-remote-config-management/ ~/.claude/skills/
```

Each skill lands as `~/.claude/skills/<name>/SKILL.md`; the wiki commands land in `~/.claude/commands/`.

In any Claude Code session, the skills auto-load when their description matches the task. To explicitly invoke:

```
Use the docker-config-qa-regression skill to verify my last compose change
Use ssh-docker-remote-config-management to update a Telegram bot env var
```

## Verify install worked

In a fresh Claude Code session:

- Type `/docker-config-qa-regression` and autocomplete should suggest the skill.
- Or ask: *"verify my last docker-compose change"* and Claude should pick up the skill by description match.
- All twelve skills should show up in the CLI's skills list.

If none of those work, see **Troubleshooting** below.

## Example output

Abbreviated `/docker-config-qa-regression` run after editing `docker-compose.yml`:

```
Running 6-phase regression check on docker-compose.yml…

Phase 1 (Container Health): all services up, no restart loops ✓
Phase 2 (Volume Mounts):
  - /app/data → ./data ✓ (host dir exists, writable)
  - /etc/myapp/config.json → ./config.json ✗ HOST FILE MISSING
    → Container will start with default config; persistence will silently fail.
Phase 3 (Credentials & Auth):
  - DATABASE_URL set ✓
  - REDIS_URL set ✓
  - SENTRY_DSN NOT set (referenced in app/sentry.ts:12) ⚠ optional
Phase 4 (Config Integrity): config.json parses, no unexpected diff vs repo copy ✓
Phase 5 (Service Connectivity): port 3000 reachable, healthcheck 200 ✓
Phase 6 (Persistence Test): settings survive `docker compose down/up` ✗ (blocked by Phase 2)

Verdict: 1 BLOCKER (Phase 2 volume mount). Fix before `docker compose up -d`.
```

The pattern: each phase has a specific check and a specific failure mode. The output tells you *exactly* what to fix, not just "something is broken."

## Conventions some skills assume

`doc-confluence` integrates with an end-of-session workflow that references a few conventions from my setup: a `/ship` command for gated pushes (public as [`claude-code-ship-gate`](https://github.com/aksheyw/claude-code-ship-gate)), a `tasks/session-handoff.md` file, and a `memory/` directory. The core methodology (tiers, hop-count contract, health checks) works without any of them, because its integration section is explicitly labeled optional; run the steps whose artifacts exist in your project and skip the rest.

## Troubleshooting

- **Skill doesn't autocomplete:** confirm each skill landed as a folder at `~/.claude/skills/<name>/SKILL.md`, not a loose `<name>.md`. Current Claude Code loads skills from the folder layout.
- **Skill doesn't auto-invoke on task description:** mention the skill name explicitly. The description-matching is fuzzy; explicit names are reliable.
- **`/wiki-*` commands missing:** they install to `~/.claude/commands/`, not `~/.claude/skills/`, so check both landed.
- **`docker-ephemeral-volume-fix` produces a long checklist but no fix:** that's expected, because the skill diagnoses the pattern, then prescribes the volume mount you need to add. The fix is one line in `docker-compose.yml`; the diagnostic walks you to it.
- **`ssh-docker-remote-config-management` quoting still breaks:** don't fight nested quoting in a one-liner: the skill's "Solution: Pipe-and-Copy Pattern" pulls the config out, edits it with jq at a single quoting level, and copies it back.

## Pattern: how to extract your own learned skills

If you want to do this yourself, the recipe:

1. **Threshold:** pick a time floor (e.g. "any debugging session > 20 min")
2. **Extract:** at session-end, write a 60-200 line markdown file:
   - **Problem:** what symptoms did you see?
   - **Root cause:** what was actually broken?
   - **Solution:** exact commands / code that fixed it
   - **Diagnostic checklist:** bash one-liners to verify next time
   - **When to use:** situations that match this pattern
3. **Add SKILL frontmatter:** `name:` and `description:` so Claude Code can auto-load
4. **Save as `~/.claude/skills/<name>/SKILL.md`:** shows up in every future session

The result: same gotcha, second time, takes 2 minutes instead of 2 hours. Compounds across your whole Claude Code career.

## Companion repos

Part of my Claude Code config series:

- [`claude-code-ship-gate`](https://github.com/aksheyw/claude-code-ship-gate): hook-enforced quality gates on every push to main
- [`claude-code-deep-review`](https://github.com/aksheyw/claude-code-deep-review): 14-lens iterative review skill
- [`claude-code-pm-agents`](https://github.com/aksheyw/claude-code-pm-agents): 7 product-builder subagents
- [`claude-code-rules`](https://github.com/aksheyw/claude-code-rules): opinionated global rules
- [`career-command-center-template`](https://github.com/aksheyw/career-command-center-template): full plugin template for an AI-native job-search workflow (12 skills, 8 personal-data skeletons, hooks)

## License

MIT (see [LICENSE](LICENSE)).

---

Built by [Akshey Walia](https://github.com/aksheyw). If you write your own learned skills and want to compare patterns, open an issue.
