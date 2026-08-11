#!/usr/bin/env python3
"""Embed a list of texts via OpenRouter and print cosine similarities sorted."""

## AI GENERATED THIS DAWG

import os
import sys
import numpy as np
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ.get("OPENROUTER_API_KEY")
if not API_KEY:
    sys.exit("Set OPENROUTER_API_KEY environment variable first.")

MODEL = "qwen/qwen3-embedding-8b"  # swap to any model OpenRouter supports
FORMATTING_TECHNIQUES = [
    'minimal',
    'explicit',
    'informative'
]

def formatEntity(name: str, type: str, technique: str) -> str :
    if technique == 'informative':
        return f'ENTITY: {name}, TYPE: {type}'
    elif technique == 'minimal':
        return f'{name}[{type}]'
    elif technique == 'explicit':
        return f'{type} {name}'
    else:
        raise Error('WRONG FORMATTING TECHNIQUE')



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
    for technique in FORMATTING_TECHNIQUES:
        texts = [
            formatEntity('rust', 'PROGRAMMING_LANGUAGE', technique),
            formatEntity('rust', 'CONCEPT', technique),
            formatEntity('rust', 'TECHNOLOGY', technique),
            formatEntity('rust', 'GAME', technique),
            formatEntity('c++', 'PROGRAMMING_LANGUAGE', technique)
        ]

        print(f"Embedding {len(texts)} texts using: '{technique}' formating technique...\n")
    
        vecs = embed(texts)
        sim = cosine_similarity_matrix(vecs)
    
        # Collect all upper-triangle pairs (skip diagonal)
        pairs = []
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                pairs.append((sim[i][j], texts[i], texts[j]))
    
        # Sort by similarity descending
        pairs.sort(key=lambda x: x[0], reverse=True)
    

    
        # Also show the full matrix
    
        header = "         " + "  ".join(f"  T{i}  " for i in range(len(texts)))
        print(header)
        for i, row in enumerate(sim):
            vals = "  ".join(f"{v:.3f}" for v in row)
            print(f"  T{i}  [{vals}]")


if __name__ == "__main__":
    main()
