#!/usr/bin/env python3
"""Embed a list of texts via OpenRouter and print cosine similarities sorted."""

## AI GENERATED THIS DAWG

import os
import sys
import numpy as np
import requests

API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not API_KEY:
    sys.exit("Set OPENROUTER_API_KEY environment variable first.")

MODEL = "qwen/qwen3-embedding-8b"  # swap to any model OpenRouter supports

texts = [
    "ENTITY: rust, TYPE: PROGRAMMING_LANGUAGE",
"ENTITY: rust, TYPE: CONCEPT",
"ENTITY: rust, TYPE: TECHNOLOGY",
"ENTITY: rust, TYPE: GAME"

]


def embed(texts: list[str], model: str = MODEL) -> np.ndarray:
    """Call OpenRouter embeddings endpoint, return (N, D) array."""
    resp = requests.post(
        "https://openrouter.ai/api/v1/embeddings",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json={"input": texts, "model": model},
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    vecs = [item["embedding"] for item in data["data"]]
    return np.array(vecs)


def cosine_similarity_matrix(vecs: np.ndarray) -> np.ndarray:
    """Row-wise cosine similarity."""
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    normalized = vecs / norms
    return normalized @ normalized.T


def main():
    print(f"Model: {MODEL}")
    print(f"Embedding {len(texts)} texts...\n")

    vecs = embed(texts)
    sim = cosine_similarity_matrix(vecs)

    # Collect all upper-triangle pairs (skip diagonal)
    pairs = []
    for i in range(len(texts)):
        for j in range(i + 1, len(texts)):
            pairs.append((sim[i][j], texts[i], texts[j]))

    # Sort by similarity descending
    pairs.sort(key=lambda x: x[0], reverse=True)

    print("Cosine similarities (sorted high → low):\n")
    for score, t1, t2 in pairs:
        print(f"  {score:.4f}  |  {t1!r}  ↔  {t2!r}")

    # Also show the full matrix
    print("\nFull similarity matrix:\n")
    header = "         " + "  ".join(f"  T{i}  " for i in range(len(texts)))
    print(header)
    for i, row in enumerate(sim):
        vals = "  ".join(f"{v:.3f}" for v in row)
        print(f"  T{i}  [{vals}]")


if __name__ == "__main__":
    main()
