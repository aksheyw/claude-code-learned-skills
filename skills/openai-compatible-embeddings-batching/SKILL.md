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

1. **Transparent batching.** Split the input list into fixed-size chunks (default 50 — conservative for Gemini Embedding 2 Preview), call the API per batch, concatenate results. Single-batch path is unchanged.
2. **Defensive error.** If a batch response still lacks `data`, raise a `RuntimeError` that surfaces the response's actual top-level keys, the batch size that triggered it, and a ~300-char preview of the response body. Future failures get diagnosable signal instead of an opaque KeyError.

## Example

```python
class OpenRouterEmbeddings(Embeddings):
    DEFAULT_BATCH_SIZE = 50

    def __init__(self, ..., batch_size: int = DEFAULT_BATCH_SIZE):
        ...
        self.batch_size = batch_size

    def _embed_one_batch(self, texts: list[str]) -> list[list[float]]:
        response = self.client.post(f"{self.base_url}/embeddings", ...)
        response.raise_for_status()
        body = response.json()
        if "data" not in body:
            keys = list(body.keys())
            raise RuntimeError(
                f"Embeddings response missing 'data' (got keys: {keys}). "
                f"Batch size: {len(texts)}. Likely exceeded per-request token "
                f"limit — reduce batch_size. Preview: {str(body)[:300]}"
            )
        return [item["embedding"] for item in body["data"]]

    def _embed(self, texts: list[str]) -> list[list[float]]:
        all_embeddings: list[list[float]] = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            all_embeddings.extend(self._embed_one_batch(batch))
        return all_embeddings
```

**Regression test pattern:** embed N inputs where N is 1.5× the default batch size. Asserts batching path actually executes, not just the trivial single-batch case.

```python
def test_embed_documents_batches_large_inputs(embeddings):
    inputs = [f"doc_{i}" for i in range(75)]  # 1.5 × 50 forces batching
    vecs = embeddings.embed_documents(inputs)
    assert len(vecs) == 75
```

## When to Use

Activate this pattern when:
- Building a custom `Embeddings` adapter against ANY OpenAI-protocol endpoint that isn't OpenAI itself (OpenRouter, vLLM, Together, Anyscale, Groq, self-hosted vLLM/TGI gateways)
- Your corpus might grow past ~100 docs (so batching matters)
- The adapter is going into a RAG chain where embedding failures cascade silently

Do NOT skip the defensive error — the bare `KeyError: 'data'` is what wasted debugging time in the originating incident.

## Origin

A recipe-RAG side project (2026-05-23). Caught on the first end-to-end run that embedded a real corpus (~520 docs); the existing regression test (which only embedded 3 docs) did NOT catch it. The scale of the test determines what it can catch.
