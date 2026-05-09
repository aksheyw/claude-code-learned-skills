# Claude Code Learned Skills — Captured From Real Sessions

> **Three Docker / SSH / VPS skills that were auto-extracted from actual debugging sessions and codified for re-use.**

Most "Claude Code skills" you'll find online are written speculatively — someone imagines a useful skill and writes it down. These three are different: they were captured *after* I'd already debugged the bug once, refined into reusable methodology, and added to my Claude Code config so the same gotcha couldn't bite me twice.

## Why I built this

I run a continuous-learning loop on every Claude Code session: when a bug takes more than 20 minutes to figure out, the resolution gets distilled into a skill. After ~6 months of this, the skills became substantial enough that I wanted them findable + share-able.

This is a slice of that library — the three Docker / SSH / VPS skills that have generalized beyond my personal stack to be useful for anyone running containerized apps on a remote VPS.

## What's in this repo

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[docker-config-qa-regression](skills/docker-config-qa-regression.md)** | 6-phase verification checklist after any docker-compose change | After modifying volumes, env vars, ports — before declaring "done" |
| **[docker-ephemeral-volume-fix](skills/docker-ephemeral-volume-fix.md)** | Diagnose and fix "settings randomly reset" pattern — when app config writes to a non-mounted path | When dashboard/UI changes don't persist across `docker compose down/up` |
| **[ssh-docker-remote-config-management](skills/ssh-docker-remote-config-management.md)** | Avoid the SSH → docker exec → jq quoting nightmare using pipe-and-copy + SIGUSR1 hot-reload | Editing JSON configs inside containers on a remote VPS |

Each skill is one self-contained Markdown file with frontmatter (`name:`, `description:`) — drop-in compatible with Claude Code's skill system.

## Install

```bash
git clone https://github.com/aksheyw/claude-code-learned-skills.git
cd claude-code-learned-skills

# Install all three at once
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

## License

MIT — see [LICENSE](LICENSE).

---

Built by [Akshey Walia](https://github.com/aksheyw). If you write your own learned skills and want to compare patterns, open an issue.
