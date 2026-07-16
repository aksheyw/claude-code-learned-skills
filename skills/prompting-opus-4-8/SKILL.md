---
name: prompting-opus-4-8
description: How to prompt and scaffold Claude Opus 4.8 — effort/thinking defaults, verbosity, literal instruction-following, tool-use and subagent triggering, code-review recall, and the cream/serif frontend house-style that's wrong for dashboards. Use when starting Opus 4.8 work, migrating prompts from Opus 4.7, tuning verbosity or effort, wondering why the model isn't "thinking", seeing a code-review recall drop, or getting a cream+serif design you didn't ask for.
---

# Prompting Claude Opus 4.8

> Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8
> — snapshot 2026-07-03. If this snapshot is >60 days old and you're doing high-stakes prompt work,
> re-fetch and reconcile against the live page.

Opus 4.8 performs well out of the box on existing Opus 4.7 prompts. The items below are the behaviors that
most often need tuning — and the two at the top are the ones that quietly cost time. Source: Anthropic's
*Prompting Claude Opus 4.8* guide, tuned to Claude Code / orchestration / PM work.

## ⚠️ Two things that surprise people first

1. **Thinking is OFF unless you ask for it.** Opus 4.8 only thinks when you set `thinking: {type: "adaptive"}`.
   If you expected visible reasoning / multi-step deliberation and got a flat direct answer, this is why —
   it's not a capability drop. Triggering is steerable: large/complex system prompts can make it think *more*
   than you want; if so, add "Thinking adds latency; use it only when it will meaningfully improve answer
   quality — typically multi-step reasoning. When in doubt, respond directly." Always measure the effect.

2. **The design house-style is cream + serif + terracotta — and it's wrong for half your surfaces.** On
   open-ended frontend/slide briefs Opus 4.8 defaults to warm cream/off-white (~`#F4F1EA`), serif display
   type (Georgia/Fraunces/Playfair), italic word-accents, terracotta/amber accent. Reads well for editorial /
   hospitality / portfolio; reads *off* for dashboards, dev tools, fintech, healthcare, enterprise — i.e.
   most dashboards and SaaS admin surfaces. It's **persistent**: generic negatives ("don't use cream",
   "make it clean/minimal") just swap it for a *different* fixed palette, not variety.
   Two things that actually work:
   - **Give a concrete alternative spec** — it follows explicit specs precisely (exact hex palette, typeface,
     radius, spacing). Name the direction; don't just forbid the default.
   - **Make it propose first** — "Before building, propose 4 distinct visual directions (each: bg hex /
     accent hex / typeface + one-line rationale). Ask me to pick, then build only that." This is the
     temperature-substitute for real variety across runs.

   Opus 4.8 needs *less* anti-slop prompting than older models, but this snippet still helps:
   ```
   <frontend_aesthetics>
   NEVER use generic AI aesthetics: overused fonts (Inter, Roboto, Arial, system), cliché schemes
   (purple gradients on white/dark), predictable layouts, cookie-cutter components. Use unique fonts,
   cohesive themes, and animation for micro-interactions.
   </frontend_aesthetics>
   ```

## Effort is the primary control

- **`xhigh` = default for coding/agentic.** Minimum **`high`** for anything intelligence-sensitive. `medium`
  for cost-sensitive, `low` only for short/scoped/latency-bound work. `max` can help the hardest tasks but
  shows diminishing returns and can overthink — test it, don't default to it.
- **Effort is respected strictly, especially at the low end.** At `low`/`medium` the model scopes to exactly
  what was asked and won't go above and beyond — good for latency, but moderately complex work at `low` risks
  under-thinking. **Fix shallow reasoning by raising effort, not by prompting around it.** If you must stay
  low for latency: "This involves multi-step reasoning. Think carefully before responding."
- Effort matters more on this model than any prior Opus — actively re-test it when you upgrade. In Claude
  Code the user owns the knob (`/model`, `/fast`) — flag or delegate; don't silently run an expensive phase
  at low or a mechanical one at high.
- At `xhigh`/`max`, set a **large max output budget** (start ~64k) so there's room to think + act across
  subagents/tool calls.

## Verbosity, literalism, tone

- **Verbosity is calibrated to judged task complexity** — short on lookups, long on open-ended analysis. If
  your output depends on a fixed style, tune it: "Provide concise, focused responses. Skip non-essential
  context, keep examples minimal." **Positive examples of the concision you want beat negative "don't" lists.**
- **It interprets instructions literally**, especially at lower effort — it won't generalize an instruction
  from one item to all, or infer requests you didn't make. Upside: precision, less thrash, great for tuned
  pipelines/extraction. If you want broad application, **state the scope**: "Apply this to every section, not
  just the first."
- **Prose is direct/opinionated, minimal validation-forward phrasing, sparing emoji.** If your product voice
  is warmer, add it explicitly: "Use a warm, collaborative tone. Acknowledge the user's framing before answering."

## Tools, subagents, progress

- **Favors reasoning over tool calls** (usually better results). Want more tool use — e.g. web search in
  knowledge work? **Raise effort to `high`/`xhigh`** (biggest lever) and/or describe explicitly when + why to
  use the tool.
- **Spawns fewer subagents by default** — steerable. Give explicit guidance: "Don't spawn a subagent for work
  you can do directly in one response (e.g. a refactor you can already see). Spawn multiple in one turn when
  fanning out across items or reading multiple files." Matters for orchestration flows.
- **User-facing progress updates are better by default.** If you added scaffolding ("summarize every 3 tool
  calls"), remove it. If cadence/contents are off for your use case, describe what updates should look like +
  give an example.

## Code-review harnesses (recall looks lower — it's a harness effect)

Opus 4.8 finds bugs better (higher recall *and* precision internally), but a harness tuned for an older model
can show *lower* reported recall: told "only high-severity" / "be conservative" / "don't nitpick", it now
**follows that faithfully** — same depth of investigation, fewer findings converted to reports. Applies to
`/code-review`-style commands, deep-review harnesses, and multi-reviewer setups. Fix it by separating
coverage from filtering:
```
Report every issue you find, including uncertain or low-severity ones. Do not filter for importance or
confidence at this stage — a separate step does that. Your goal here is coverage: better to surface a
finding that gets filtered than to silently drop a real bug. For each, include confidence + estimated
severity so a downstream filter can rank them.
```
If you want single-pass self-filtering, set a **concrete** bar ("report anything that could cause incorrect
behavior, a test failure, or a misleading result; omit only pure style/naming nits") — not qualitative words
like "important". Validate recall/F1 gains against a subset of your evals.

## Interactive coding + computer use

- **Interactive (multi-turn) sessions use more tokens** than autonomous single-turn, because it reasons more
  after user turns — buys long-horizon coherence + instruction-following. To keep both performance and
  efficiency: use `xhigh`/`high`, add an auto mode, **specify task + intent + constraints fully in the first
  turn**, and minimize required human turns. Ambiguous prompts dribbled across turns cost tokens and sometimes
  quality.
- **Computer use** works up to 2576px / 3.75MP; **1080p is the performance/cost sweet spot**, 720p / 1366×768
  for cost-sensitive runs. Tune effort to shape behavior.
