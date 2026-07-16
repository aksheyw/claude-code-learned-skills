---
name: prompting-fable-5
description: How to prompt and scaffold Claude Fable 5 / Mythos 5 — effort levels, long-horizon runs, parallel subagents, memory, the send-to-user tool, and how to reduce false-positive safety fallbacks on legitimately benign work (Opus 4.8 is the intended fallback). Use when starting Fable-5 work, migrating skills/prompts from Opus, or diagnosing why benign work keeps falling back to Opus. Note: if a task is genuinely in a restricted domain, the fallback is intended safety behaviour, not something to work around.
---

# Prompting Claude Fable 5 (and Mythos 5)

Fable 5 is the top Mythos-class tier (above Opus). It shines on long-horizon, ambiguous, hours-to-days
work. Prompt/scaffold it differently from Opus 4.8. Source: Anthropic's *Prompting Claude Fable 5* guide
+ hygiene lessons from benign review work that kept falling back to Opus (snapshot 2026-07-02).

## ⚠️ Why benign work sometimes falls back to Opus (read this FIRST)

Fable 5 runs safety classifiers. When one fires, the turn returns `stop_reason: "refusal"` and falls back to
Opus 4.8 — in some Claude Code configurations that swap happens automatically. **That fallback is the
intended safety net, and most of the time it is the system working correctly.** This section is only about
one narrower thing: the classifiers also produce **false positives on legitimately benign work**, and when
honest, in-scope work keeps bouncing it's worth knowing why and how to cut the noise.

> **Scope — this is about false positives on benign work, nothing else.** If a task is genuinely in a
> restricted domain (real exploit/malware development, actual dangerous-bio methods), the fallback is the
> intended safety behaviour — that's the classifier doing its job, and you should not try to circumvent it.
> Everything below applies only when ordinary, legitimate work trips the filter. If you're unsure which case
> you're in, treat it as the intended behaviour and let the fallback stand.

Where benign work can trip it:

1. **Security review of your own code** — a read-only audit (RLS, auth, cross-tenant isolation, secret
   handling, IDOR) can score like offensive tooling even though you're reviewing an app you own.
2. **Biology / life sciences** — benign lab or mechanism discussion can trip the bio classifier.
3. **`reasoning_extraction`** — any instruction that tells the model to **echo / transcribe / explain its
   internal reasoning as response text.** This is the sneakiest, because it's self-inflicted and has nothing
   to do with your topic — a "show your thinking" instruction trips it on otherwise-benign turns.

### The two self-inflicted triggers — both are simple hygiene fixes

- **"Show your thinking" output styles or instructions.** The Claude Code **"learning" and "explanatory"
  output styles** inject "★ Insight" blocks / "explain your implementation choices" on every turn → they
  trip `reasoning_extraction` on EVERY Fable turn, even benign ones. **Turn these output styles OFF for
  Fable.** Audit skills/system prompts for "walk me through your reasoning", "explain your thought process",
  "reflect and show your work" and remove them — don't instruct the model to echo its raw reasoning as prose.
  If you need reasoning visibility, read the structured `thinking` blocks (adaptive thinking) instead, or use
  a send-to-user tool for progress. (Quick check: if your first reply contains a "★ Insight" block, the
  output style is still on.)
- **Keep durable state in files so a fallback loses no work.** A fallback mid-run shouldn't cost you
  anything. Persist work to files and run long jobs as background workflows/tasks, so if a turn falls back to
  Opus the state is already saved and you just continue. This is good hygiene regardless of classifiers.

### If benign review work keeps falling back

- **Describe the task as what it honestly is** — "review my own app's tenant isolation", "readiness
  assessment" — because that is the accurate description, not to slip anything past a check. Accurate scoping
  won't (and shouldn't) get restricted content through; it just avoids mislabelling benign work as offensive.
- **Prefer fresh-context verifier subagents for review** — they beat self-critique on quality anyway (see
  below). But a subagent's model is **configuration-dependent**: a subagent that inherits Fable will hit the
  same classifier and fall back too. Verify the subagent config rather than assuming subagents are immune.
- **If genuinely-benign work still keeps bouncing, treat it as a known false-positive limitation** — accept
  the Opus fallback for that work, or report the false positive through normal feedback channels. Don't
  re-architect the task specifically to keep flagged content away from the classifier; that would cross from
  "reduce noise on benign work" into working around a safety check, which is out of scope here.

## Effort is the primary control

- Default **`high`** for most tasks. **`xhigh`** for the most capability-sensitive work. **`medium`/`low`**
  for routine/mechanical work — Fable's low still often beats prior models' xhigh.
- Lower effort if a task finishes but takes longer than needed, or you want a snappier interactive loop.
- Effort tracks **reversibility/blast-radius, not task size.** In Claude Code, the user owns the effort knob
  (`/model`, `/fast`) — flag or delegate; don't silently run an expensive phase at low effort or vice-versa.

## Longer turns by default — restructure for async

Hard requests run many minutes; autonomous runs, hours. Adjust timeouts; **check on runs asynchronously**
(background workflows/tasks that notify on completion) rather than blocking. Don't poll harness-tracked work.

## Strong instruction-following — steer with brief instructions, not enumerations

Fable follows short directives well; you don't have to name every behavior. Useful stock instructions:

- **Brevity/readability:** "Lead with the outcome. Being readable and being concise are different things;
  readability matters more. Don't compress into fragments, arrow-chains, or jargon."
- **Checkpoints:** "Pause for the user only when the work genuinely requires them — a destructive/
  irreversible action, a real scope change, or input only they can provide. Then ask and end the turn."
- **Ground progress claims:** "Before reporting progress, audit each claim against a tool result from this
  session. Only report work you can point to evidence for; if unverified, say so." (Near-eliminates fabricated status.)
- **Scope discipline:** "Don't add features, refactors, abstractions, or defensive error-handling beyond
  what the task requires. Do the simplest thing that works."
- **Anti-overplanning (Fable over-deliberates on ambiguity at high effort):** "When you have enough
  information to act, act. Don't re-derive facts already established, re-litigate a settled decision, or
  narrate options you won't pursue in user-facing messages. If weighing a choice, give a recommendation, not
  an exhaustive survey. (This doesn't apply to thinking blocks.)"
- **Boundaries:** "When the user is describing/asking/thinking-out-loud rather than requesting a change, the
  deliverable is your assessment — report and stop; don't apply a fix until asked."

## Parallel subagents + memory + send-to-user

- **Delegate readily.** Fable dispatches and sustains parallel subagents well. "Delegate independent
  subtasks and keep working while they run; intervene if one goes off track." Long-lived subagents keep
  context (cache reads) and avoid bottlenecking on the slowest. Prefer async over blocking.
- **Self-verification:** fresh-context **verifier subagents** beat self-critique. "Verify your work with
  subagents against the spec at intervals." Note a subagent's model is **configuration-dependent** — it can
  run on a different configured model, but a subagent that inherits Fable behaves like Fable (same effort
  characteristics, same classifiers); check the config rather than assuming otherwise.
- **Memory:** give it a place to write lessons (one file per lesson, one-line summary on top; update, don't
  duplicate; delete wrong notes). Bootstrap by having it reflect on past sessions via subagents.
- **send-to-user tool** (long async agents): a client tool that renders its input verbatim without ending
  the turn — for deliverables/direct answers the user must see exactly. Pair with an elicitation instruction
  or it won't get called. Don't route narration through it.

## Rare late-session quirks (and the one-line fixes)

- **Early stop** (text-only "I'll now run X" with no tool call): "continue" / "go ahead end-to-end" suffices;
  add an autonomous-operation reminder for pipelines.
- **Context-budget worry** (offers to hand off / summarize): avoid surfacing token countdowns; if you must,
  add "You have ample context remaining; do not stop or suggest a new session on account of context limits."

## Scaffolding changes when migrating from Opus

- **Start at the top of your difficulty range** — give it your hardest unsolved problem, not simple workloads.
- **Refactor over-prescriptive skills/prompts** — Opus-era enumerated instructions can *degrade* Fable's
  output. Remove older micro-instructions when default behavior is already better. Fable updates skills on the fly.
- **Never instruct it to reproduce/echo its reasoning in the response** — triggers `reasoning_extraction`
  fallbacks (see the gotcha section). Audit for reflection/show-your-thinking language when migrating.
- **Give the reason, not just the request** — "I'm working on X for Y; they need Z; with that in mind: …".

## One-line diagnosis for "my BENIGN Fable session keeps dropping to Opus"

If genuinely benign work is falling back, check in order: (1) an active **learning/explanatory output style**
or any show-your-thinking instruction → turn it off (the highest-yield fix, and pure hygiene); (2) your
prompts/skills contain "echo/explain your reasoning" language → remove it. If neither applies and the work is
truly benign, this is a **known false positive** — accept the Opus fallback or report it, and make sure your
state is in files so the fallback costs you nothing. Reminder: if the work is actually in a restricted
domain, the fallback is the intended behaviour, not a bug to route around.
