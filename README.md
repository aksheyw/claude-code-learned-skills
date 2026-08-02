<div align="center">

# 🔧 Claude Code Learned Skills: captured from real sessions

### Twelve skills, none of them imagined in advance.

![requires](https://img.shields.io/badge/requires-Claude%20Code-D97757) ![skills](https://img.shields.io/badge/skills-12-0E9384) ![written](https://img.shields.io/badge/written-after%20the%20fact-1B2A4A) ![dependencies](https://img.shields.io/badge/dependencies-none-lightgrey) ![license](https://img.shields.io/badge/license-MIT-green)

</div>

---

Claude Code is Anthropic's AI coding assistant. It runs in your terminal, reads the files in your
project, and can change them for you. A **skill** is a markdown file of instructions it loads and
follows on its own when a matching task comes up.

Most skills you find online were imagined in advance. These were all written afterwards, out of
debugging sessions that had already cost me the time, and out of testing I'd already run.

<img src="docs/how-a-skill-gets-here.svg" width="100%"
     alt="How every skill here got written. A bug eats more than 20 minutes of a working session. At session end I write down the symptoms, the root cause, the exact fix and a checklist. That gets saved as one markdown file at ~/.claude/skills/name/SKILL.md, with no build step. Every session after, Claude Code loads it by itself when the task matches, so the same gotcha costs far less the second time. The library today holds twelve skills: 3 on Docker, SSH and remote servers, 2 on data and machine learning pipelines, 4 field guides to prompting AI models, 2 on finding bugs and organising docs, and 1 project wiki that outlives sessions. That last one is the most used: it runs in 16 of my projects, and the biggest of those wikis is 358 pages. Every skill is plain markdown with no dependencies.">

## Why writing them afterwards is the whole point

If I write a skill in advance I only ever write the happy path, because that's all I know at that
point. Writing it afterwards, I already know the symptom I actually saw and the thing I wrongly
blamed first, which is the part that saves the time later.

So these read like field notes rather than documentation. The Docker one exists because container
settings kept resetting on me, and the cause was a config file being written to a path that was
never mounted. The embeddings one exists because a provider answered an error with HTTP 200 and no
data in it, which looks like success until everything downstream is quietly empty.

I've been building with Claude Code since late 2025, and extracting skills like this from the
sessions since early 2026. The pile eventually got big enough to be worth sharing, and this is the
slice of it that has generalised past my own stack.

<details>
<summary><b>📋 All twelve skills, what each does, and when to reach for it</b></summary>

Each skill is a self-contained folder, `skills/<name>/SKILL.md`, with the `name:` and `description:`
frontmatter that current Claude Code expects.

### Docker, SSH and remote servers

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[docker-config-qa-regression](skills/docker-config-qa-regression/SKILL.md)** | 6-phase verification checklist after any `docker-compose` change | After changing volumes, environment variables or ports, before you call it done |
| **[docker-ephemeral-volume-fix](skills/docker-ephemeral-volume-fix/SKILL.md)** | Diagnoses the "settings randomly reset" pattern, where the app writes its config to a path that was never mounted | When changes made in a dashboard don't survive `docker compose down/up` |
| **[ssh-docker-remote-config-management](skills/ssh-docker-remote-config-management/SKILL.md)** | Sidesteps the SSH into `docker exec` into `jq` quoting nightmare with a pipe-and-copy pattern plus a hot reload | Editing JSON configs inside containers on a remote VPS, meaning a server you rent and log into |

### Data and machine learning pipelines

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[huggingface-dataset-script-deprecation](skills/huggingface-dataset-script-deprecation/SKILL.md)** | A substitution workflow for older Hugging Face datasets that version 4 of the `datasets` library now refuses to load | On `RuntimeError: Dataset scripts are no longer supported` |
| **[openai-compatible-embeddings-batching](skills/openai-compatible-embeddings-batching/SKILL.md)** | Batching plus defensive error handling, because some providers return an error inside an HTTP 200 with no `data` key, which reads as success | Building against any OpenAI-protocol embeddings endpoint, such as OpenRouter, vLLM, Together or a self-hosted one |

### Field guides to prompting AI models

These four are a different species from the rest. They come from published sources I cite, mainly
Anthropic's own prompting guides and the Qwen3-Coder model card, plus my own testing, rather than
from a single debugging session. Each one names its source and carries a snapshot date, so if that
date is more than about 60 days old, re-fetch the source and reconcile before you lean on it. Opus, Sonnet and Fable are
Anthropic models; qwen3-coder is an open-weight model you can run on your own machine.

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[prompting-fable-5](skills/prompting-fable-5/SKILL.md)** | Cutting false safety refusals on legitimate security work, plus effort levels, long-run scaffolding, subagents and memory | Benign security or bio review work that keeps bouncing to another model, or general Fable 5 scaffolding |
| **[prompting-opus-4-8](skills/prompting-opus-4-8/SKILL.md)** | Thinking being off by default, effort tuning, how literally it follows instructions, the code-review recall effect, and that stubborn cream and serif design default | Starting Opus 4.8 work, migrating from 4.7, or getting a cream and serif design you never asked for |
| **[prompting-sonnet-5](skills/prompting-sonnet-5/SKILL.md)** | The migration breakers: sampling parameters now return a 400 error, roughly 30% more tokens, thinking budgets gone, plus effort mapping and tool-use triggering | Migrating a Sonnet 4.6 prompt or API call, or picking Sonnet for a subagent |
| **[prompting-qwen3-coder](skills/prompting-qwen3-coder/SKILL.md)** | A model with no thinking channel at all, its official sampling parameters, tool calling as the documented path, and the measured "silent or flooding" failure signature | Wiring qwen3-coder into a local review seat, or debugging a local model that returns nothing or invents things |

### Finding bugs and organising docs

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[audit](skills/audit/SKILL.md)** | A 10-category systemic bug finder, the ten listed below the table | Code review, pre-deployment, or any "did we miss anything?" moment |
| **[doc-confluence](skills/doc-confluence/SKILL.md)** | Hub-and-spoke documentation architecture, so any agent finds any fact in one or two hops. Init, audit and health modes, size budgets for files that load automatically, and one authoritative home per fact | New project setup, a `CLAUDE.md` that has bloated, or docs that contradict each other |

The ten categories, in the skill's own order: raw database values leaking into the interface; client
and server disagreeing about what they send each other; Firestore rules gaps and the orphaned data a
delete leaves behind; missing production domains in CORS; consent and analytics gating in both
directions, features blocked when consent is denied and tracking that fires anyway when it isn't;
CSS classes stripped by the build; security hygiene, from unsafe `window.open` to mobile
misconfigurations; mocks going stale when a module gains an export; performance; and accessibility.
Most carry how to detect it, the ripple search (one instance means there are more) and a fix pattern,
and five of the ten ship a copy-paste GitHub Actions step, so CI keeps the fix fixed.

### A project wiki that outlives the session

| Skill | What it does | When to use |
|-------|--------------|-------------|
| **[llm-wiki](skills/llm-wiki/SKILL.md)** | A wiki per project that compounds across sessions: ingest a learning, query a past decision, lint for contradictions. A working implementation of [Karpathy's LLMwiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It's now the convention in 16 of my projects, and the biggest of those wikis is 358 pages. Ships with 4 slash commands ([`/wiki-init`](commands/wiki-init.md), [`/wiki-ingest`](commands/wiki-ingest.md), [`/wiki-query`](commands/wiki-query.md), [`/wiki-lint`](commands/wiki-lint.md)) and a linter for frontmatter vocabulary | Any project that outlives one session |

</details>

## Install

You need [Claude Code](https://claude.com/claude-code) itself first, because these are files it reads
rather than a program you run. `~/.claude/` is the folder it keeps its own settings in, so the commands
below copy files into it and nothing else.

```bash
git clone https://github.com/aksheyw/claude-code-learned-skills.git
cd claude-code-learned-skills

# All twelve at once
mkdir -p ~/.claude/skills ~/.claude/commands
cp -r skills/. ~/.claude/skills/

# The four wiki slash commands
cp commands/*.md ~/.claude/commands/

# Or just the one you came for (no trailing slash on the source path)
cp -r skills/ssh-docker-remote-config-management ~/.claude/skills/
```

In any Claude Code session the skills load themselves when the description matches what you asked for.
To call one by name:

```
Use the docker-config-qa-regression skill to verify my last compose change
```

<details>
<summary><b>🔍 Check the install took, and what to do if it didn't</b></summary>

In a fresh Claude Code session, type `/docker-config-qa-regression` and autocomplete should suggest
it. Or just ask *"verify my last docker-compose change"* and it should pick the skill up on its own.
All twelve should appear in the CLI's skills list.

- **A skill doesn't autocomplete:** check it landed as a folder, `~/.claude/skills/<name>/SKILL.md`,
  and not as a loose `<name>.md`. Current Claude Code only loads the folder layout.
- **A skill doesn't trigger from the task description:** name it explicitly. The matching is fuzzy,
  the name is reliable.
- **The `/wiki-*` commands are missing:** they install to `~/.claude/commands/`, not to
  `~/.claude/skills/`. Check both landed.
- **`docker-ephemeral-volume-fix` gives a long checklist and no fix:** that's what it's for. It
  diagnoses the pattern, then points at the volume mount you need to add, which is one line in
  `docker-compose.yml`.
- **`ssh-docker-remote-config-management` quoting still breaks:** stop fighting nested quotes in a
  one-liner. The pipe-and-copy pattern pulls the config out, edits it at a single level of quoting,
  and copies it back.

</details>

<details>
<summary><b>📄 What a run actually looks like</b></summary>

An abbreviated `/docker-config-qa-regression` run after editing `docker-compose.yml`:

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

Each phase has one specific check and one specific failure mode, so the output tells you what to fix
instead of just saying something is broken.

</details>

## Write your own

The diagram above is the short version. In full:

1. **Pick a time floor:** any debugging session that runs past 20 minutes, say.
2. **When you cross it, write it up** while it's fresh, 60 to 200 lines: the symptoms you saw, what
   was actually broken, the exact commands that fixed it, a checklist to verify it next time, and
   when this pattern applies.
3. **Add the frontmatter,** which is a `name:` and a `description:` line between two `---` fences at
   the very top of the file. The description is what Claude Code matches against your task, so write
   it as the situation you'd be in, not as a title.
4. **Save it** as `~/.claude/skills/<name>/SKILL.md` and it's in every session you run from then on.

The second time you hit the same bug, you skip the part where you blame the wrong thing first.

<details>
<summary><b>📦 One assumption worth knowing about before you install</b></summary>

`doc-confluence` refers to a few conventions from my own setup: a `/ship` command for gated pushes
(public as [`claude-code-ship-gate`](https://github.com/aksheyw/claude-code-ship-gate)), a
`tasks/session-handoff.md` file, and a `memory/` directory. The core method works without any of
them, because that integration section is labelled optional. The tiers, the hop-count contract and
the health checks don't depend on my setup at all, so run the steps whose files exist in your
project and skip the rest.

</details>

## Companion repos

Part of my Claude Code config series:

- [`claude-code-ship-gate`](https://github.com/aksheyw/claude-code-ship-gate): hook-enforced quality gates on every push to main
- [`claude-code-deep-review`](https://github.com/aksheyw/claude-code-deep-review): a 14-lens iterative review skill
- [`claude-code-pm-agents`](https://github.com/aksheyw/claude-code-pm-agents): 7 product-builder subagents
- [`claude-code-rules`](https://github.com/aksheyw/claude-code-rules): opinionated global rules
- [`career-command-center-template`](https://github.com/aksheyw/career-command-center-template): a full plugin template for an AI-native job search, with 12 skills, 8 personal-data files you fill in yourself, and hooks

## License

MIT (see [LICENSE](LICENSE)).

---

Built by [Akshey Walia](https://github.com/aksheyw). If you write your own learned skills and want to
compare patterns, open an issue.
