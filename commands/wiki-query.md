---
description: Search the project wiki and synthesize an answer
argument-hint: <question about this project>
allowed-tools: Read, Grep, Glob
---

Search the project wiki to answer a question. Follow the query operation from `~/.claude/skills/llm-wiki/references/operations.md`.

## Steps

1. **Verify wiki exists**
   - If `wiki/` does not exist but `.claude/wiki/` does, the wiki is in its old location: say so, offer to move it with `mv .claude/wiki wiki`, and stop.
   - If neither exists: "No wiki found. Use `/wiki-init` to set one up."
   - If `wiki/` exists but has no `_index.md` (for example a two-file notebook of `_hot.md` and `_log.md`), say so and offer to run `/wiki-init`. It adds only the missing files and leaves the existing ones untouched. Do not continue until `_index.md` exists.

2. **Search for relevant pages**
   - Read `wiki/_index.md` to scan topic descriptions
   - Grep `wiki/` for keywords from the question, excluding `archive/` unless the question concerns history or the user asks to include it
   - Identify up to 5 most relevant pages

3. **Read and synthesize**
   - Read matching pages
   - Synthesize an answer grounded in wiki content
   - Include citations: `[source: [[page-name]], learned YYYY-MM-DD]`
   - If multiple pages contribute, cross-reference them

4. **Handle gaps**
   - If no pages match: "No wiki entries found for this topic."
   - If partial match: answer what's available, flag what's missing
   - If query reveals a gap: "This topic isn't covered yet. Want me to research it and `/wiki-ingest` the findings?"

5. **Offer to file**
   - If the synthesized answer is valuable and not already in the wiki, offer: "Should I save this answer as a wiki page?"

## Rules
- Never answer from training data alone — ground in wiki content
- Use citation format: `[source: [[page-name]], learned YYYY-MM-DD]`
- Don't read the entire wiki — use _index.md to target relevant pages
