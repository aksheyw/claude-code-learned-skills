---
name: prompting-sonnet-5
description: How to prompt and scaffold Claude Sonnet 5 — the migration-from-4.6 API breakers (sampling params now error, new tokenizer inflates tokens ~30%, extended-thinking budgets removed), adaptive-thinking-on-by-default, effort mapping, tool-use triggering, and design/code-review tuning. Use when starting Sonnet 5 work, picking Sonnet as a subagent model, migrating a 4.6 prompt or n8n/API call, hitting a 400 error on temperature, or seeing max_tokens truncation.
---

# Prompting Claude Sonnet 5

> Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5
> — snapshot 2026-07-03. If this snapshot is >60 days old and you're doing high-stakes prompt work,
> re-fetch and reconcile against the live page.

Sonnet 5 performs well out of the box on existing Sonnet 4.6 prompts, but a few **API-level changes will hard-
error or silently truncate** if you migrate a 4.6 call unchanged — those are up top. Source: Anthropic's
*Prompting Claude Sonnet 5* guide, tuned to Claude Code subagent selection + n8n/OpenRouter-style API paths.

## ⚠️ Migrating a 4.6 call? Four things break or shift first

1. **Sampling params now 400-error.** Setting `temperature`, `top_p`, or `top_k` to any non-default value
   returns a **400** on Sonnet 5 (new for Sonnet-class). **Remove them.** For tone/variety, steer via the
   system prompt instead (see design section for the variety pattern). Audit any n8n HTTP nodes / API
   wrappers — a hardcoded `temperature` there will now fail the call.
2. **New tokenizer ≈ +30% tokens for the same text.** `max_tokens` limits tuned for 4.6 can now truncate
   equivalent output. **Raise `max_tokens`.** Exact inflation depends on content.
3. **Manual extended thinking is removed.** `thinking: {type:"enabled", budget_tokens:N}` returns a **400**
   (deprecated on 4.6, gone now). Use **adaptive thinking + the effort parameter** instead.
4. **Adaptive thinking is ON by default.** A request with no `thinking` field now runs with adaptive thinking
   — a change from 4.6, where the same request ran with none. Consequences: (a) revisit `max_tokens` for
   workloads that ran thinking-off on 4.6; (b) on long tasks thinking can eat the budget, giving a response
   that's mostly thinking then a truncated answer + `stop_reason: "max_tokens"` — raise `max_tokens` or drop
   to `medium`. To turn it off entirely: `thinking: {type:"disabled"}`. If it thinks more often than you like
   (big system prompts trigger it), steer: "Thinking adds latency; use it only when it meaningfully improves
   answer quality — typically multi-step reasoning. When in doubt, respond directly."

## Effort

- **Default `high`** (same as 4.6). **`xhigh`** for the hardest coding/agentic work. `medium`/`low` for
  cost/latency, respected strictly — at `low`/`medium` it scopes to exactly what's asked; moderately complex
  work at `low` risks under-thinking. **Fix shallow reasoning by raising effort, not prompting around it.**
- **Cross-model mapping when migrating:** Sonnet 5 at `medium` ≈ Sonnet 4.6 at `high`; Sonnet 5 at `high` ≈
  Sonnet 4.6 at `max`. Benchmark by **observed thinking length**, not effort name.
- Leave **headroom in `max_tokens`** at `high`/`xhigh`/`max` — adaptive thinking can take a large share on
  long tasks (see gotcha #4).

## Tools, verbosity, literalism, tone

- **More agentic than 4.6** — reaches for tools + self-verification loops more readily. But **with thinking
  disabled it's less likely to reach for tools or consider searching** — if you rely on tool calls thinking-
  off, add an explicit nudge. Effort is also a lever: `high`/`xhigh` → substantially more tool use in
  agentic search/coding.
- **Verbosity calibrated to task complexity** — tune with "Provide concise, focused responses…"; positive
  concision examples beat "don't" lists.
- **Literal instruction-following**, especially at lower effort — won't generalize an instruction across
  items or infer unasked requests. State scope explicitly ("apply to every section, not just the first").
  Great for tuned extraction/pipelines.
- **Tone** may shift on long-form; if you rely on a specific voice, re-check against the new baseline and add
  it explicitly ("warm, collaborative; acknowledge the framing first").

## Design + frontend

Sonnet 5 can settle into a fixed default house-style on open-ended briefs — fine for some, off for dashboards
/ dev tools / fintech / healthcare / enterprise. Generic negatives just swap one fixed palette for another.
Two reliable moves (same as Opus 4.8):
- **Concrete alternative spec** — it follows explicit hex/typeface/radius/spacing specs precisely.
- **Propose-4-directions-first** — and since `temperature` is unavailable here, this is *the* recommended way
  to get real variety across runs: "Before building, propose 4 distinct directions (bg hex / accent hex /
  typeface + one-line rationale). I'll pick one, then build only that."

Anti-slop snippet still useful:
```
<frontend_aesthetics>
NEVER use generic AI aesthetics: overused fonts (Inter, Roboto, Arial, system), cliché schemes (purple
gradients on white/dark), predictable layouts, cookie-cutter components. Use unique fonts, cohesive themes,
and animation for micro-interactions.
</frontend_aesthetics>
```

## Code-review harnesses (recall looks lower — harness effect)

Same as Opus 4.8: told "only high-severity / be conservative / don't nitpick", Sonnet 5 follows it faithfully
— same investigation depth, fewer findings reported. Separate coverage from filtering:
```
Report every issue you find, including uncertain or low-severity ones. Do not filter for importance or
confidence at this stage — a separate step does that. Goal here is coverage. For each, include confidence +
estimated severity for a downstream filter to rank.
```
For single-pass self-filter, set a concrete bar ("could cause incorrect behavior, a test failure, or a
misleading result; omit only style/naming nits"), not qualitative words. Validate against a subset of evals.

## Interactive coding + computer use

- **Interactive multi-turn uses more tokens** than autonomous single-turn. Maximize performance + efficiency:
  `xhigh`/`high`, an auto mode, and **fully specify task + intent + constraints in the first turn** to
  minimize human turns.
- **Computer use:** tool version `computer_20251124`, up to 2576px / 3.75MP; **1080p** is the sweet spot,
  720p / 1366×768 for cost-sensitive runs.
