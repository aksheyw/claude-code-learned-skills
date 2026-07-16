---
name: huggingface-dataset-script-deprecation
description: Work around `RuntimeError: Dataset scripts are no longer supported` when loading pre-2024 HuggingFace datasets on `datasets` v4.x. Empirical substitution workflow — find parquet-native community mirrors, verify schemas by streaming the first sample instead of trusting the README, and document the substitution honestly in the loader.
---

# HuggingFace Dataset Substitution: Legacy Scripts in datasets v4.x

**Extracted:** 2026-05-23
**Context:** When `datasets.load_dataset("legacy/dataset-id")` fails with `RuntimeError: Dataset scripts are no longer supported, but found X.py`. Routine in 2026 against pre-2024 HF datasets that haven't been converted to parquet.

## Problem

Many popular HF datasets (e.g., `mbien/recipe_nlg`, `m3hrdadfi/recipe_nlg_lite`) were published before HuggingFace's switch to parquet-native datasets. They ship a `dataset_name.py` script that the `datasets` library used to execute to materialize the rows. `datasets` v4.x removed support for this entirely as a security hardening. Loading raises:

```
RuntimeError: Dataset scripts are no longer supported, but found X.py
```

There's no flag to opt back in on v4.x, but the dataset is **not** dead — you have several routes:

- **Load the raw data files directly** via a generic builder (`load_dataset("csv"/"json"/"parquet"/"text", data_files=...)`) pointed at the Hub files or a local copy — this skips the removed script path entirely when the underlying data is plain files.
- **Convert locally once** — download the raw files, materialize them to parquet yourself, and load that.
- **Use a parquet-native community mirror** (the workflow below), if one exists and its provenance checks out.
- **Run the loader in an isolated older environment** (a separate venv pinned to `datasets` v3.x) as a last resort — but only sandboxed and never as your main pipeline's pinned version (see Don't).

Community-mirror substitution (below) is usually the fastest, but it is not the only option — reach for a raw-file load or a local conversion when a trustworthy mirror doesn't exist.

## Solution

Empirical substitution workflow:

1. **Search for community mirrors first.** Try a small set of likely IDs in the same domain — convention: someone usually re-uploads popular datasets in parquet form. For recipes: `corbt/all-recipes`, `Shengtao/recipe` worked; others (`BangumiBase/recipenlg`) didn't exist.
2. **Test by streaming-load + inspecting first sample.** Don't trust the HF dataset description — empirically inspect actual field names and types. Field schemas drift; the README may not match the parquet.

   > **A one-row stream is a SMOKE TEST, not schema verification.** It proves the mirror loads and roughly what a row looks like — nothing more. Before you rely on a substitute, also verify: **provenance** (who uploaded it, does it credibly derive from the original vs a random re-scrape), **license** (the mirror may not carry the original's license/terms — check before use, especially commercially), **split equivalence** (same train/val/test boundaries, or you'll leak across splits), and **contamination / dedup** (a mirror can silently include rows your model was trained/evaluated on). Loadability + row shape is the cheapest 1% of the check; the provenance and split questions are the part that actually protects your results.
3. **Compare structured vs text-blob.** Some "replacement" datasets ship rows as a single text blob (title + ingredients + directions concatenated) that needs parsing. Prefer structured datasets where possible.
4. **Honest naming.** If you substitute `mbien/recipe_nlg` with `Shengtao/recipe`, do NOT name your loader function `load_recipenlg_sample()` — that's misleading. Use a generic name like `load_global_recipes()` and record the actual source in the function docstring + commit message.

## Example

Empirical test script — drop in a couple of candidate IDs:

```python
from datasets import load_dataset

candidates = ["original/legacy", "community/parquet-mirror", "another/option"]
for c in candidates:
    try:
        ds = load_dataset(c, split="train", streaming=True)
        first = next(iter(ds))
        print(f"PASS  {c}")
        print(f"  fields: {list(first.keys())[:10]}")
        for k, v in list(first.items())[:5]:
            print(f"    {k}: {type(v).__name__}  example={repr(v)[:80]}")
    except Exception as e:
        print(f"FAIL  {c}: {type(e).__name__}: {str(e)[:80]}")
```

Then in the loader:

```python
def load_global_recipes(n=500, seed=42, min_rating=4.0):
    """Load a sampled set of global recipes.

    NOTE on substitution: original `mbien/recipe_nlg` is no longer loadable
    (legacy dataset script, removed in `datasets` v4.x). Substituted
    `Shengtao/recipe` — parquet-native, ~32k recipes, structured fields.
    Verified empirically in <project>.
    """
    try:
        from datasets import load_dataset
    except ImportError as e:
        raise ImportError(
            "The `datasets` package is required. Install via: uv sync --extra corpus"
        ) from e

    ds = load_dataset("Shengtao/recipe", split="train", streaming=True)
    ...
```

## When to Use

Activate when you see:
- `RuntimeError: Dataset scripts are no longer supported`
- HuggingFace dataset described in pre-2024 papers/tutorials and you're on `datasets` v4.x
- The dataset's HF Hub page shows a `.py` file in its file listing

## Don't

- Don't pin `datasets` to v3.x to "fix" this — you'll be stuck on a security-unpatched version
- Don't fabricate a dataset that "matches the schema you wanted" — substitute honestly with a real one and document the substitution in the docstring + commit message
- Don't name the loader after the original dataset if the actual source differs — misleading

## Origin

A recipe-RAG side project (2026-05-23). The empirical test of 4 candidate datasets (only 2 of which worked) is the key safety step — don't trust dataset descriptions.
