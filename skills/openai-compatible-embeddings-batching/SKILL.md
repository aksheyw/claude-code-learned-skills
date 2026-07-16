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

Two-layer fix at the adapter level:

1. **Transparent batching, capped by size not just count.** A fixed document *count* per batch does NOT guarantee you stay under the provider's per-request *token*/*byte* limit — 50 short docs and 50 long ones are very different payloads. So the batcher below caps each batch by **both** a document count **and** an approximate character budget (a cheap stand-in for tokens; swap in a real tokenizer count for exact control). Single-batch path is unchanged.

2. **Defensive error that doesn't leak.** If a batch response still lacks `data`, raise a `RuntimeError` that surfaces the response's top-level keys and its length — **not** the raw body, which can echo request text or provider internals into logs. That's enough to diagnose without spilling user content.

## Example

```python
class OpenRouterEmbeddings(Embeddings):
    DEFAULT_BATCH_SIZE = 50
    # Approximate per-request char budget (~ token limit, char-estimated).
    # Tune per provider; replace with a real tokenizer count for exact control.
    APPROX_CHAR_BUDGET = 90_000

    def __init__(self, ..., batch_size: int = DEFAULT_BATCH_SIZE):
        ...
        self.batch_size = batch_size

    def _batches(self, texts: list[str]):
        """Yield batches capped by BOTH a doc count and an approximate char budget."""
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

    def _embed_one_batch(self, texts: list[str]) -> list[list[float]]:
        response = self.client.post(f"{self.base_url}/embeddings", ...)
        response.raise_for_status()
        body = response.json()
        if "data" not in body:
            # Log keys + length only — NOT the raw body (it can echo input text
            # or provider internals into logs).
            raise RuntimeError(
                f"Embeddings response missing 'data' (top-level keys: {list(body.keys())}; "
                f"body length: {len(str(body))} chars). Batch of {len(texts)} likely "
                f"exceeded the per-request token limit — reduce batch_size / APPROX_CHAR_BUDGET."
            )
        return [item["embedding"] for item in body["data"]]

    def _embed(self, texts: list[str]) -> list[list[float]]:
        all_embeddings: list[list[float]] = []
        for batch in self._batches(texts):
            all_embeddings.extend(self._embed_one_batch(batch))
        return all_embeddings
```

**Regression test — assert the request COUNT, not just the output count.** `assert len(vecs) == 75` would pass even for a single un-batched call, so it does not prove batching ran. Spy on the per-batch call and assert how many times it fired — that is the real behavioural check:

```python
def test_embed_documents_makes_two_batch_calls(embeddings, mocker):
    spy = mocker.spy(embeddings, "_embed_one_batch")
    vecs = embeddings.embed_documents([f"doc_{i}" for i in range(75)])
    assert len(vecs) == 75          # sanity: every input got a vector
    assert spy.call_count == 2      # the real check: 75 inputs / batch 50 -> 2 requests
```

## When to Use

Activate this pattern when:
- Building a custom `Embeddings` adapter against ANY OpenAI-protocol endpoint that isn't OpenAI itself (OpenRouter, vLLM, Together, Anyscale, Groq, self-hosted vLLM/TGI gateways)
- Your corpus might grow past ~100 docs (so batching matters)
- The adapter is going into a RAG chain where embedding failures cascade silently

Do NOT skip the defensive error — the bare `KeyError: 'data'` is what wasted debugging time in the originating incident.

## Origin

A recipe-RAG side project (2026-05-23). Caught on the first end-to-end run that embedded a real corpus (~520 docs); the existing regression test (which only embedded 3 docs) did NOT catch it. The scale of the test determines what it can catch.
