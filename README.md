# Claude Code Learned Skills — Captured From Real Sessions

> **Nine skills extracted from actual debugging and research sessions — Docker / SSH / VPS ops, data & ML pipeline gotchas, and model prompting field guides.**

Most "Claude Code skills" you'll find online are written speculatively — someone imagines a useful skill and writes it down. These are different: they were captured *after* I'd already debugged the bug (or run the experiments) once, refined into reusable methodology, and added to my Claude Code config so the same gotcha couldn't bite me twice.

## Why I built this

I run a continuous-learning loop on every Claude Code session: when a bug takes more than 20 minutes to figure out, the resolution gets distilled into a skill. After ~6 months of this, the skills became substantial enough that I wanted them findable + share-able.

This is a slice of that library — the skills that have generalized beyond my personal stack: Docker / SSH / VPS ops, two data/ML pipeline gotchas, and four model prompting guides.

## What's in this repo

### Docker / SSH / VPS

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[docker-config-qa-regression](skills/docker-config-qa-regression.md)** | 6-phase verification checklist after any docker-compose change | After modifying volumes, env vars, ports — before declaring "done" |
| **[docker-ephemeral-volume-fix](skills/docker-ephemeral-volume-fix.md)** | Diagnose and fix "settings randomly reset" pattern — when app config writes to a non-mounted path | When dashboard/UI changes don't persist across `docker compose down/up` |
| **[ssh-docker-remote-config-management](skills/ssh-docker-remote-config-management.md)** | Avoid the SSH → docker exec → jq quoting nightmare using pipe-and-copy + SIGUSR1 hot-reload | Editing JSON configs inside containers on a remote VPS |

### Data & ML pipelines

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[huggingface-dataset-script-deprecation](skills/huggingface-dataset-script-deprecation.md)** | Substitution workflow for legacy script-based HF datasets that `datasets` v4.x refuses to load | On `RuntimeError: Dataset scripts are no longer supported` |
| **[openai-compatible-embeddings-batching](skills/openai-compatible-embeddings-batching.md)** | Transparent batching + defensive errors for embeddings adapters — some providers return HTTP 200 error bodies with no `data` key | Building an adapter against any OpenAI-protocol embeddings endpoint (OpenRouter, vLLM, Together, self-hosted) |

### Model prompting field guides

A slightly different species from the rest: distilled from cited public sources (Anthropic's prompting guides, the Qwen model card + generation config + blog) plus my own testing, rather than from a single debugging session. Each carries its source URLs and a snapshot date — if the snapshot is more than ~60 days old, re-fetch the source and reconcile before high-stakes use.

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[prompting-fable-5](skills/prompting-fable-5.md)** | Effort levels, long-horizon scaffolding, subagents/memory — and the safety classifiers that silently bounce sessions to Opus 4.8 | Starting Fable-5 work, migrating prompts from Opus, or diagnosing a session that keeps falling back to Opus |
| **[prompting-opus-4-8](skills/prompting-opus-4-8.md)** | Thinking-off-by-default, effort tuning, literal instruction-following, the code-review recall harness effect, and the persistent cream/serif design default | Starting Opus 4.8 work, migrating from 4.7, or getting a cream+serif design you didn't ask for |
| **[prompting-sonnet-5](skills/prompting-sonnet-5.md)** | The 4.6-migration API breakers (sampling params now 400-error, +30% tokenizer, thinking budgets removed), effort mapping, tool-use triggering | Migrating a Sonnet 4.6 prompt or API call, or picking Sonnet as a subagent model |
| **[prompting-qwen3-coder](skills/prompting-qwen3-coder.md)** | Non-thinking model with no deliberation channel; official sampling params, tool calling as the sanctioned path, and the measured "silent or flooding" failure signature | Wiring qwen3-coder into a local review seat, or debugging an empty/fabricating local model |

Each skill is one self-contained Markdown file with frontmatter (`name:`, `description:`) — drop-in compatible with Claude Code's skill system.

## Install

```bash
git clone https://github.com/aksheyw/claude-code-learned-skills.git
cd claude-code-learned-skills

# Install all nine at once
mkdir -p ~/.claude/skills
cp skills/*.md ~/.claude/skills/

# Or install just the one you need
cp skills/ssh-docker-remote-config-management.md ~/.claude/skills/
```

In any Claude Code session, the skills auto-load when their description matches the task. To explicitly invoke:

```
Use the docker-config-qa-regression skill to verify my last compose change
Use ssh-docker-remote-config-management to update a Telegram bot env var
```

## Verify install worked

In a fresh Claude Code session:

- Type `/docker-config-qa-regression` — autocomplete should suggest the skill.
- Or ask: *"verify my last docker-compose change"* — Claude should pick up the skill by description match.
- All nine skills should show in `/help skills`.

If none of those work, see **Troubleshooting** below.

## Example output

Abbreviated `/docker-config-qa-regression` run after editing `docker-compose.yml`:

```
Running 6-phase regression check on docker-compose.yml…

Phase 1 — Syntax: `docker compose config` passed ✓
Phase 2 — Volume mounts:
  - /app/data → ./data ✓ (host dir exists, writable)
  - /etc/myapp/config.json → ./config.json ✗ HOST FILE MISSING
    → Container will start with default config; persistence will silently fail.
Phase 3 — Env vars:
  - DATABASE_URL set ✓
  - REDIS_URL set ✓
  - SENTRY_DSN NOT set (referenced in app/sentry.ts:12) ⚠ optional
Phase 4 — Ports: 3000:3000 ✓ no conflict on host
Phase 5 — Healthcheck: defined, 30s interval ✓
Phase 6 — Restart policy: unless-stopped ✓

Verdict: 1 BLOCKER (Phase 2 volume mount). Fix before `docker compose up -d`.
```

The pattern: each phase has a specific check and a specific failure mode. The output tells you *exactly* what to fix — not just "something is broken."

## Troubleshooting

- **Skill doesn't autocomplete:** confirm files landed at `~/.claude/skills/<name>.md` (flat). Skills with directory layout (`~/.claude/skills/<name>/SKILL.md`) also work, but pick one.
- **Skill doesn't auto-invoke on task description:** mention the skill name explicitly. The description-matching is fuzzy; explicit names are reliable.
- **`docker-ephemeral-volume-fix` produces a long checklist but no fix:** that's expected — the skill diagnoses the pattern, then prescribes the volume mount you need to add. The fix is one line in `docker-compose.yml`; the diagnostic walks you to it.
- **`ssh-docker-remote-config-management` quoting still breaks:** the skill's pipe-and-copy pattern needs you to be on the remote host already, not running `ssh user@host 'docker exec ...'` from local. Read the skill's "Anti-pattern" section.

## Pattern: how to extract your own learned skills

If you want to do this yourself, the recipe:

1. **Threshold** — pick a time floor (e.g. "any debugging session > 20 min")
2. **Extract** — at session-end, write a 60-200 line markdown file:
   - **Problem** — what symptoms did you see?
   - **Root cause** — what was actually broken?
   - **Solution** — exact commands / code that fixed it
   - **Diagnostic checklist** — bash one-liners to verify next time
   - **When to use** — situations that match this pattern
3. **Add SKILL frontmatter** — `name:` and `description:` so Claude Code can auto-load
4. **Commit to your `~/.claude/skills/` directory** — shows up in every future session

The result: same gotcha, second time, takes 2 minutes instead of 2 hours. Compounds across your whole Claude Code career.

## Companion repos

Part of my Claude Code config series:

- [`claude-code-deep-review`](https://github.com/aksheyw/claude-code-deep-review) — 14-lens iterative review skill
- [`claude-code-pm-agents`](https://github.com/aksheyw/claude-code-pm-agents) — 7 product-builder subagents
- [`claude-code-rules`](https://github.com/aksheyw/claude-code-rules) — opinionated global rules
- [`career-command-center-template`](https://github.com/aksheyw/career-command-center-template) — full plugin template for an AI-native job-search workflow (10 skills, 5 personal-data skeletons, hooks)

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Akshey Walia](https://github.com/aksheyw). If you write your own learned skills and want to compare patterns, open an issue.
