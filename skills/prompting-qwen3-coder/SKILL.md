---
name: prompting-qwen3-coder
description: How to prompt and run Qwen3-Coder (qwen3-coder:30b via Ollama) — a NON-thinking model with no deliberation channel, optimised as an agentic patch-writer (though it CAN critique — measured). Covers the official sampling params, tool calling as the vendor's structured path, the 256K/YaRN context story, and the "silent or flooding" failure signature — including the measured finding that a reviewer prompt's own suppression clauses, NOT grammar-forced JSON, silence it. Use when prompting Qwen3-Coder, wiring it into a local council/review seat, debugging an empty or fabricating seat, tuning sampling, or deciding whether it is the right model for a job.
---

# Prompting Qwen3-Coder

> Source: model card https://huggingface.co/Qwen/Qwen3-Coder-30B-A3B-Instruct + its `generation_config.json`
> + https://github.com/QwenLM/Qwen3-Coder + https://qwenlm.github.io/blog/qwen3-coder/ — snapshot
> 2026-07-16, verified against a local Ollama 0.32.0 install. If this snapshot is >60 days old and you're
> doing high-stakes work, re-fetch and reconcile.

Read the first item before anything else. It is the one that invalidates whole categories of prompt work,
and it cost one project four controlled experiments to learn the hard way.

---

## 1. It is a NON-thinking model. There is no deliberation channel. (the big one)

Model card, verbatim:

> "This model supports only non-thinking mode and does not generate `<think></think>` blocks in its output."

Consequences, and they are large:

- **`/think`, `/no_think`, and `enable_thinking` do NOT apply.** Those are **Qwen3-general** features. The
  official Qwen quickstart has no Qwen3-Coder section at all. Sending `think` is not a no-op — qwen-code
  issue #1377 reports a hard `400: "qwen3-coder:30b" does not support thinking`.
- `ollama show qwen3-coder:30b` → `Capabilities: completion, tools`. **No `thinking`.** (Compare gpt-oss:20b,
  which *does* list `thinking`.) That one command is the fastest way to check this for any model.
- **Any prompt that asks it to "think step by step", "reason carefully first", or "take your time" is asking
  for a channel that does not exist.** It has no exposed thinking channel and does not emit `<think>` blocks;
  it cannot externalize deliberation *before* the answer. It reasons fine when asked directly (measured — §2,
  §7), but whatever reasoning happens shows up *in the emitted answer tokens themselves*, never in a separate
  hidden pass first.

> **The practical rule:** if you need deliberation to precede the answer, either give it room to reason **in
> its output** (see §3), or use a different model. Asking it to "think harder first" targets a channel it
> does not have — it is ineffective, not a fix.

## 2. It is OPTIMISED as an agentic patch-writer — but that is not a capability bound

> ⚠️ **CORRECTED 2026-07-16, same day, by measurement.** An earlier version of this section said
> *"it is an agentic patch-WRITER, **not a critic** — this is a routing fact."* **That was wrong, and it was
> my inference, never Qwen's claim.** Measured: asked directly about a lossy `_down` migration, qwen3-coder
> **found the bug 5/5** with ~300 tokens of correct reasoning about post-`up` divergence. It critiques fine.
> **Optimisation target ≠ capability ceiling.** Four official sources name what it was *tuned for*; **none**
> states a limit, and the research capture behind this guide explicitly logged *"NOT FOUND: whether code
> review is an intended use."* I let absence of evidence harden into evidence of absence. Don't repeat it.
> Evidence: a controlled silence-probe eval, 2026-07-16 (ablation details in §7 item 2).

**Read the positioning as a prior, not a verdict.** Every official source positions it the same way, and
none of them says "reviewer":

- Release blog: *"our most agentic code model to date"* — framed around multi-turn environment interaction.
- Model card: *"excels in tool calling"*, *"Agentic Coding"* with a specially designed function-call format.
- Ollama: *"advanced long-horizon reinforcement learning on **SWE-Bench**"*, *"optimized for repository-scale
  understanding"*.

**Its headline RL objective rewards producing a working patch — not emitting a critique of someone else's.**

Whether one-shot code review is an intended use: **NOT FOUND.** No vendor says it can't. No vendor says it can.
Treat that as **absence of evidence** — and note that measurement (2026-07-16) shows it **can** review when
asked directly. So "make it a reviewer" is a decision the vendor does not *bless*, not one it *forbids*.

**Its documented sweet spots:** agentic tool-driven coding, code completion, fill-in-the-middle, repo-scale
understanding, 358 languages.

## 3. Prefer tool calling over `format: "json"` — on vendor grounds, not as a silence fix

The vendor's **only** documented structured-output path is **tool calling** (the card documents an
OpenAI-compatible tools API; the README ships a dedicated tool parser for SGLang and vLLM). Ollama honours
this natively: `PARSER qwen3-coder`, `Capabilities: … tools`.

**Tool calling is the documented structured-output path; grammar-constrained JSON (`format: "json"` / GBNF)
guidance was NOT FOUND for this model** — neither endorsed nor warned against. That is absence of evidence,
not evidence of prohibition: it is undocumented for this model, not forbidden.

> ⚠️ **CORRECTED 2026-07-16 by measurement — the mechanism below is REFUTED as a cause of SILENCE.**
> A 2×2 factorial (format:json × brace-shape, n=10 each, qwen3-coder) came back **0/10 in every cell** —
> removing the grammar changed **nothing**. The real cause was the *reviewer prompt's suppression clauses*
> (the same model, asked the same question **without** that framing, found the bug 5/5). Tool calling is
> still the vendor's documented path and the advice below still stands **on vendor grounds** — just do not
> expect dropping `format: "json"` to un-silence a quiet seat. Evidence: the same 2026-07-16 probe
> (§7 item 2).

**The REFUTED hypothesis — why grammar was *thought* to hurt THIS model** (an inference from verified facts,
never a Qwen claim — priced at ~50% and **refuted 0/10 in every cell of a 2×2**; retained only because the
reasoning is instructive and the vendor facts hold, NOT as a live explanation):

A non-thinking model + a grammar forcing the first token to be `{` = **nowhere to reason**. The model's first
structural decision is `{"findings": [` and then immediately whether to emit `]`. Under that constraint the
empty/null answer is the shortest, highest-probability, always-valid completion. Emitting real content
requires having *already* solved the problem with zero deliberation tokens spent. **Plausible — and measured
false.** Removing the grammar changed nothing (0/10 → 0/10). Do not carry this mechanism forward as a cause.

**The CONFIRMED cause — the reviewer prompt's own suppression clauses — produces a "silent or flooding"
signature:**
- Suppression clause left in → fast, well-formed, confident **empty** results. Not a crash. Not malformed.
  Just nothing. Which means whiff-detection and "did it error?" checks **cannot catch it**.
- Suppression clause removed / the prompt pushed for output → **flooding / confabulation** (measured: it
  flagged a bug-free control diff 9/10 and produced *more* findings on clean code than on buggy — §7 item 2).

**If you see either pole, suspect YOUR PROMPT first — measured.** The grammar was the intuitive culprit and
it was refuted 0/10 in every cell of a 2×2. Suppression clauses in the reviewer framing were the actual
cause. Check what your prompt tells it NOT to do before you touch the output format.

**In order of preference:**
1. **Tool calling** — the documented path, and the output mode it was actually RL-trained for. Highest effort.
2. **Free prose, parsed leniently** — give it room to reason in its output, then extract. Cheapest test.
3. **`format: "json"`** — what most harnesses reach for first. Undocumented for this model (not forbidden),
   so worth moving off toward the documented path — but **it is not what silences a seat**, so do not chase
   it as a fix.

## 4. Official sampling parameters — use them; don't quietly override them

From the model card's Best Practices, corroborated exactly by the shipped `generation_config.json`
(the model's own decode defaults — the strongest primary source):

| Param | Official |
|---|---|
| `temperature` | **0.7** |
| `top_p` | **0.8** |
| `top_k` | **20** |
| `repetition_penalty` | **1.05** |
| `do_sample` | **true** (sampling ON by default) |

Recommended output length: **65,536 tokens** for most queries.

**Ollama's packaging is faithful** — `ollama show --modelfile qwen3-coder:30b` reproduces all four exactly.
So if your numbers differ from the table, **that is your harness deviating, not Ollama.** Check your own
code before blaming the model. A harness that sets one global temperature across several models is the
usual culprit; make it per-seat.

**The greedy-decoding warning — get the scope right.** The warning *"DO NOT use greedy decoding, as it can
lead to performance degradation and endless repetitions"* is real and OFFICIAL, but it lives on the **Qwen3
general** quickstart, **not** on the Qwen3-Coder card. Two honest caveats: its documented failure mode is
**endless repetition, not silence**, and Qwen's own Coder README recommends `do_sample=False` (greedy) for
FIM — so Qwen is not globally anti-greedy here. **Low temperature is hygiene to fix, not an explanation for
an empty model.** Don't over-read it.

## 5. Context

- **Native 262,144 (256K)**; extendable to ~1M via **YaRN** (org-level README only — there is **no YaRN
  section on the 30B model card**, so no per-model "when to enable" guidance or stated cost exists. Don't
  cite one).
- **The Ollama default context is version-dependent — do not rely on any default.** The tested install
  (Ollama 0.32.0, 2026-07-16) served **4096 regardless of the model's native window**. Current Ollama has
  moved to VRAM-dependent defaults (roughly 4K / 32K / 256K chosen by available memory), so the number you
  get now depends on your Ollama version and hardware. Precedence is stable: API param >
  `OLLAMA_CONTEXT_LENGTH` > Modelfile PARAMETER > built-in default. **Set `num_ctx` explicitly** rather than
  trusting whatever the default happens to be, or you may silently truncate.
- On constrained hardware, `num_ctx` is the big memory lever: the native 256K window blows the KV cache to
  ~45GB and thrashes a 24GB machine.

## 6. Prompt format

Standard ChatML via `tokenizer.apply_chat_template()`, `[{"role": ..., "content": ...}]`. Specials:
`<|im_start|>`, `<|im_end|>`, `<|endoftext|>`. Ollama compiles this into `RENDERER qwen3-coder`, so template
corruption is an unlikely failure mode there.

**What breaks the template: NOT FOUND** — no official "don't do X" list exists.

**Untested, no vendor guidance either way:** whether a `system` role helps, and whether splitting
instructions and content across messages changes behaviour. If you test it, you're generating new evidence,
not applying known guidance — so use a control.

## 7. Debug checklist — empty or garbage output

Run these in order. Each is cheap and rules out a whole class:

1. `ollama show <model>` → does it list `thinking`? If not, **delete every "think first" instruction** and
   stop trying to enable a mode that isn't there.
2. **Does your prompt give it explicit permission to return nothing?** **This is the highest-yield check —
   do it before the grammar.** A placebo-controlled ablation (7 arms x 2 diffs x n=10, 2026-07-16) isolated
   **one clause** as a binary switch:

   > *"If the diff looks clean, return an empty findings array. Do not manufacture findings."*

   Removing **that sentence alone**: 0/10 → **10/10** speaks. Removing *"do not invent issues"*,
   *"no style nitpicks"*, or the *"other reviewers are looking at this too"* framing: **0/10 each — inert**.
   A same-meaning paraphrase (placebo): **0/10** — so it is that clause, not prompt perturbation.

   **⚠ But do NOT just delete it.** Removing it made the model flag a **bug-free** control diff in **9/10**
   runs and produce **MORE findings on clean code (30) than on buggy code (23)** — it pattern-matches the
   *shape* of a risky construct rather than detecting the bug. The clause is load-bearing FP suppression.
   **For this model, on this diff class, it is silence or flood — there is no dial.** Never ablate it
   without a bug-free twin diff in the same batch; that twin is the only thing that catches this.
3. Are you sending `format: "json"` / a grammar? → worth trying free prose + lenient parse on vendor grounds
   (§3) — but **measured NOT to be a silence cause**. Do not expect it to fix an empty seat.
4. Do your sampling params match §4? → if not, that's your harness, not the model.
5. Is `num_ctx` set explicitly? → the Ollama default is version-dependent (4096 on the tested 0.32.0; newer
   builds pick a VRAM-dependent default) and can truncate silently — don't rely on it (§5).
6. **Positive control — run this the moment output looks uniform:** ask the model a plain question about the
   input ("which files changed?") and ask it directly about the suspected bug, with **no** role framing. If it
   answers both, the model is fine and **your scaffold is the bug**. This one check overturned two confident
   wrong conclusions in a single session.
7. **Ruled out already, don't re-derive:** thinking toggles (§1), YaRN/context extension (§5), Ollama-vs-vendor
   param mismatch (§4 — there isn't one), and ollama#10976 "empty output" (needs tools **+** `think`; if you
   send neither, it's not your bug).
8. Still empty **after** the positive control shows it can answer? → now it's scaffold, not model. If the
   positive control **also** comes back empty, only then consider the wrong-model conclusion (§2) — and note
   that conclusion has been drawn wrongly before.

## 8. The meta-lesson (why this skill exists)

The originating project — a local-model review council — ran **four** controlled prompt experiments (120
runs, predefined rubrics) trying to make this model contribute as a review seat. **All four were rejected.**
The vendor documentation explained why in one sentence on the model card — the model cannot think, and they
were prompting it to think.

**Read the card and run `ollama show` before you design an experiment.** Prompt tuning cannot fix a
capability the model does not have — that part stands.

**But the sequel matters more.** All four rejected experiments **ADDED** targeting instructions. **None
removed the prompt's suppression clauses.** 0-for-4 on *adding* says nothing about *removing* — and it was
the suppression clauses, not the model, that produced the silence. The 2026-07-16 probe then refuted the
"wrong model" conclusion outright: it finds the bug 5/5 when asked without the reviewer framing.

**Three lessons, each paid for:**
1. **Optimisation target ≠ capability ceiling.** Don't turn "tuned for X" into "can't do Y."
2. **Run a positive control before concluding a model can't.** Ask it directly, no framing.
3. **Predefine the metric and the threshold — never the conclusion.** A rule that bundles its own inference
   will fire confidently and be wrong. (Three-for-three in one session.)

## 9. Known gaps — stated, not filled

- **No vendor guidance on empty responses, over-refusal, or under-flagging.** §3's mechanism is an inference.
- **No statement on whether code review is an intended use.**
- **No `presence_penalty` published** for Qwen3-Coder. Don't invent one.
- **No official position on `format: json` / GBNF** for this model — so §3's advice is an evidence-backed
  hypothesis, not a vendor-blessed rule. Labelled deliberately.
- **Other variants exist** (verified in the official list): `Qwen3-Coder-Next(-Base/-FP8/-GGUF)`,
  `480B-A35B-Instruct(-FP8)`, `30B-A3B-Instruct-FP8`. This skill is scoped to **30B-A3B-Instruct**; do not
  assume it transfers, especially to `Next`.
