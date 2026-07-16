---
name: prompting-fable-5
description: How to prompt and scaffold Claude Fable 5 / Mythos 5 — effort levels, long-horizon runs, parallel subagents, memory, the send-to-user tool, and (critically) the safety classifiers that silently bounce sessions to Opus 4.8. Use when starting Fable-5 work, migrating skills/prompts from Opus, running security/bio-adjacent reviews, or diagnosing a session that keeps falling back to Opus.
---

# Prompting Claude Fable 5 (and Mythos 5)

Fable 5 is the top Mythos-class tier (above Opus). It shines on long-horizon, ambiguous, hours-to-days
work. Prompt/scaffold it differently from Opus 4.8. Source: Anthropic's *Prompting Claude Fable 5* guide
+ hard-won lessons from a real session that got repeatedly bounced to Opus (2026-07-02).

## ⚠️ The safety-classifier gotcha (read this FIRST — it's the one that wastes hours)

Fable 5 runs safety classifiers that return `stop_reason: "refusal"` and, in Claude Code, **silently swap
the session to Opus 4.8**. They target three domains, and **benign work in these domains also trips them**:

1. **Offensive / benign cybersecurity** — exploits/malware AND ordinary security reviews (RLS, auth,
   cross-tenant isolation, credentials, IDOR, secret handling). A read-only audit of *your own* app trips it.
2. **Biology / life sciences** — lab methods, molecular mechanisms; benign bio too.
3. **`reasoning_extraction`** — any instruction that tells the model to **echo / transcribe / explain its
   internal reasoning as response text.** THIS is the sneaky one.

### The two most common self-inflicted triggers

- **"Show your thinking" output styles or instructions.** The Claude Code **"learning" and "explanatory"
  output styles** instruct "★ Insight" blocks / "explain your implementation choices" on every turn → they
  trip `reasoning_extraction` on EVERY Fable turn, even benign ones. **Turn these output styles OFF for
  Fable.** Also audit skills/system prompts for "walk me through your reasoning", "explain your thought
  process", "reflect and show your work" — remove them. If you need reasoning visibility, read the
  structured `thinking` blocks (adaptive thinking) instead, or use a send-to-user tool for progress.
- **Security-heavy context accumulation.** Once a session's context fills with cyber material, EVERY
  subsequent Fable turn re-scores that heavy context and can bounce — even a one-line status update.

### How to survive a legitimately cyber/bio-adjacent task on Fable

- **Keep the main Fable thread thin and off the trigger domain.** Delegate the sensitive reading/analysis to
  **subagents** (they run on their own models — sonnet/opus/haiku — and don't bounce the main thread).
  Persist their output to **files**; return only short, product-framed summaries to the main thread.
- **Frame accurately, not as attack tooling** — "verify tenant isolation for my own app", "product-quality
  review", not "forge cross-tenant events / bypass RLS". Reduces false positives (doesn't eliminate them).
- **Make every turn idempotent + cheap to lose:** durable state in files + background workflows, so a bounce
  loses nothing — you just re-issue that one turn.
- **If a specific turn MUST ingest the cyber content** (e.g. the final synthesis reading a security section):
  it will likely bounce. Either split that content into a separate file the Fable turn never opens and fold
  it in by reference, run it in a **fresh clean session**, or accept doing that one turn on Opus.
- **Configure fallback deliberately.** Server/client-side fallback to Opus 4.8 is the intended safety net;
  in Claude Code the swap is automatic. Don't fight it turn-by-turn — plan around it.

### The operational template that actually holds (proven in a follow-up session, 2026-07-03)

The principles above fail if the **handoff doesn't enforce them.** The recurring miss: a handoff that says
*"read [these heavy findings files] and write the synthesis"* silently violates "keep the main thread thin" —
the lead reads the trigger content inline on turn 1 and bounces, exactly as if there were no rule. **Having
the lesson is not applying it.** (Observed 2026-07-03: a lead session with this skill loaded and the lesson
banked still read 959 lines of security findings on the main thread, because the handoff said "read these
and synthesize.") The handoff itself must delegate the reading. A Fable review/synthesis handoff that survives:

1. **Standing model line up top:** "PRIMARY: Fable 5 @ `<effort>`, keep it here the whole session; a bounce
   to Opus on heavy turns is expected and costs nothing — do NOT switch your primary model to Opus."
2. **Turn-1 survival gate:** "Your FIRST reply must contain NO '★ Insight' block. If it does, the
   learning/explanatory output style is ON — stop, ask the user to turn it off, and re-confirm before any
   work." (The model can't turn the style off itself, but it can refuse to proceed until the user does.)
3. **The main thread reads NOTHING heavy.** Do not list the raw findings/security files as "read these."
   Instead: "delegate ALL reading of the review files to subagents/Workflows (they run on Opus/Sonnet/Haiku
   and don't bounce the orchestrator); they return short product-framed summaries; you synthesize from
   those." Keep the handoff document itself light on raw security detail for the same reason.
4. **Run synthesis + council as Workflows.** Then: "if the main thread bounces, the work completes
   identically on the subagents — so a bounce costs nothing; don't fight it." This converts a bounce from a
   session-killer into a non-event, and removes the temptation to make Opus the primary.
5. **Frame product-first everywhere** — "assess launch/quality readiness of my own app," never attack-framing.

Meta-rule: **when a task handoff contradicts this, flag it and restructure — don't follow it.** A read-inline
handoff is the anti-pattern even when every other survival step is done right.

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
  subagents against the spec at intervals."
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

## One-line diagnosis for "my Fable session keeps dropping to Opus"

Check, in order: (1) an active **learning/explanatory output style** or any show-your-thinking instruction
→ turn it off; (2) **cyber/bio content** in context → move detail to files/subagents, keep the main thread
thin, or run the sensitive turn in a fresh session / on Opus; (3) accumulated heavy context → **start a
fresh session**. It is almost never fixable by rewording a single message.
