---
name: openai-compatible-embeddings-batching
description: Custom embeddings adapters against OpenAI-compatible endpoints (OpenRouter, vLLM, Together, Anyscale, Groq, self-hosted gateways) must batch transparently and fail loudly — some providers return HTTP 200 with a non-standard error body missing the `data` key, which surfaces as a bare KeyError deep inside LangChain. Includes the two-layer adapter fix and the regression test that actually exercises the batching path.
---

# OpenAI-Compatible Embeddings: Batch Transparently or Fail Silently

**Extracted:** 2026-05-23
**Context:** Any project using a custom adapter against an OpenAI-compatible embeddings endpoint (OpenRouter, vLLM gateways, Together, Anyscale, Groq, self-hosted TGI, etc.) with a corpus larger than a few dozen documents.

## Problem

OpenAI-protocol `/embeddings` endpoints accept a list under `input` and return embeddings in `data[].embedding`. Per-request token limits vary by provider and underlying model — OpenRouter + `google/gemini-embedding-2-preview` chokes above ~500 small documents in one POST.

**The dangerous failure shape:** rather than returning HTTP 4xx, OpenRouter returns **HTTP 200 with a non-standard error body that lacks the `data` key**. `response.raise_for_status()` passes. The next line — `[item["embedding"] for item in body["data"]]` — surfaces as a bare `KeyError: 'data'` deep inside LangChain or wherever the adapter is invoked. Zero signal about the actual cause.

Worst case: the test suite that embedded 10 docs passes; production embed of 500+ docs crashes the first time a user opts in to the large corpus.

## Solution

Three layers at the adapter level — the third is what makes it actually safe:

1. **Group by count + an approximate size budget.** A fixed document *count* per batch does NOT stay under the provider's per-request *token*/*byte* limit — 50 short docs and 50 long ones are very different payloads. Grouping by both a doc count and an approximate character budget helps, but a character count is only a **heuristic** for tokens — it never *guarantees* you're under the real limit, and a single document larger than the budget still can't be split by grouping alone. So grouping is a first pass, not the safety net.

2. **Adaptive halving is the real safety net.** Wrap each batch call so that if the provider still rejects it for size, the batch is **halved and retried** until it fits — or, if a single document alone still exceeds the limit, that surfaces as a clear error (a genuine problem, not a batching one). This makes the adapter correct regardless of how far off the character estimate was, and handles the oversized-single-doc case grouping can't.

3. **Defensive error that doesn't leak.** When a response lacks `data`, raise an error that surfaces the response's JSON type, top-level keys (if it's an object), and its length — **not** the raw body, which can echo request text or provider internals into logs.

## Example

```python
class _EmbeddingLimitError(RuntimeError):
    """Raised when a batch is (probably) over the provider's per-request limit."""

class OpenRouterEmbeddings(Embeddings):
    DEFAULT_BATCH_SIZE = 50
    # Heuristic per-request char budget (~ token limit, char-estimated). Tune per
    # provider; a real tokenizer count is more exact, but the halving retry below is
    # what actually guarantees correctness, so an estimate here is fine.
    APPROX_CHAR_BUDGET = 90_000

    def __init__(self, ..., batch_size: int = DEFAULT_BATCH_SIZE):
        ...
        self.batch_size = batch_size

    def _batches(self, texts: list[str]):
        """First-pass grouping by doc count AND approximate char budget."""
        batch, chars = [], 0
        for t in texts:
            if batch and (len(batch) >= self.batch_size
                          or chars + len(t) > self.APPROX_CHAR_BUDGET):
                yield batch
                batch, chars = [], 0
            batch.append(t)
            chars += len(t)
        if batch:
            yield batch

    def _post_embeddings(self, texts: list[str]) -> list[list[float]]:
        response = self.client.post(f"{self.base_url}/embeddings", ...)
        response.raise_for_status()
        body = response.json()
        if not isinstance(body, dict) or "data" not in body:      # guard non-object JSON
            keys = list(body.keys()) if isinstance(body, dict) else "n/a"
            # Log type + keys + length only — NOT the raw body (it can echo input
            # text or provider internals into logs).
            raise _EmbeddingLimitError(
                f"Embeddings response has no 'data' (json type: {type(body).__name__}, "
                f"top-level keys: {keys}, length: {len(str(body))} chars). Batch of "
                f"{len(texts)} likely exceeded the per-request token limit."
            )
        return [item["embedding"] for item in body["data"]]

    def _embed_one_batch(self, texts: list[str]) -> list[list[float]]:
        """Char budgeting is only an estimate; if a batch still trips the real limit,
        halve and retry so the run self-corrects. A single doc that still fails is a
        genuine error, not a batching one."""
        try:
            return self._post_embeddings(texts)
        except _EmbeddingLimitError:
            if len(texts) == 1:
                raise
            mid = len(texts) // 2
            return self._embed_one_batch(texts[:mid]) + self._embed_one_batch(texts[mid:])

    def _embed(self, texts: list[str]) -> list[list[float]]:
        all_embeddings: list[list[float]] = []
        for batch in self._batches(texts):
            all_embeddings.extend(self._embed_one_batch(batch))
        return all_embeddings
```

**Regression test — assert the request COUNT, not just the output count.** `assert len(vecs) == 75` would pass even for a single un-batched call, so it does not prove batching ran. Spy on the HTTP-making call and assert how many times it fired:

```python
def test_embed_documents_makes_two_batch_calls(embeddings, mocker):
    spy = mocker.spy(embeddings, "_post_embeddings")
    vecs = embeddings.embed_documents([f"doc_{i}" for i in range(75)])   # 75 small docs, no split
    assert len(vecs) == 75          # sanity: every input got a vector
    assert spy.call_count == 2      # the real check: 75 inputs / batch 50 -> 2 requests

def test_oversized_batch_halves_and_retries(embeddings, mocker):
    # First call rejects for size, then the halves succeed -> more than one request.
    calls = {"n": 0}
    def fake_post(texts):
        calls["n"] += 1
        if calls["n"] == 1:
            raise _EmbeddingLimitError("too big")
        return [[0.0] for _ in texts]
    mocker.patch.object(embeddings, "_post_embeddings", side_effect=fake_post)
    embeddings._embed_one_batch([f"doc_{i}" for i in range(4)])
    assert calls["n"] == 3          # 1 rejected + 2 halves
```

## When to Use

Activate this pattern when:
- Building a custom `Embeddings` adapter against ANY OpenAI-protocol endpoint that isn't OpenAI itself (OpenRouter, vLLM, Together, Anyscale, Groq, self-hosted vLLM/TGI gateways)
- Your corpus might grow past ~100 docs (so batching matters)
- The adapter is going into a RAG chain where embedding failures cascade silently

Do NOT skip the defensive error — the bare `KeyError: 'data'` is what wasted debugging time in the originating incident.

## Origin

A recipe-RAG side project (2026-05-23). Caught on the first end-to-end run that embedded a real corpus (~520 docs); the existing regression test (which only embedded 3 docs) did NOT catch it. The scale of the test determines what it can catch.
