"""
code_search.py  —  Lightweight keyword-based RAG retrieval.

Given a natural-language question and the full list of repo files,
returns the top-K most relevant files with their content.

No vector DB required — uses simple token overlap scoring:
  • filename/path tokens
  • first 50 lines of each file (function names, class names, imports)
"""

import os
import re

# Files we skip for content reading (binary, too large, not code-useful)
_SKIP_EXTENSIONS = {
    ".lock", ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
    ".woff", ".woff2", ".ttf", ".eot", ".map", ".min.js",
    ".min.css", ".pyc", ".pyo",
}

_MAX_FILE_BYTES = 80_000   # don't read files larger than 80 KB
_PREVIEW_LINES  = 50       # lines to use for scoring
_CONTENT_CHARS  = 2_500    # chars of content to send to Ollama per file


def _tokenize(text: str) -> set[str]:
    """Lowercase word tokens from a string."""
    return set(re.findall(r"[a-z][a-z0-9_]{1,}", text.lower()))


def _score_file(question_tokens: set[str], filepath: str, repo_path: str) -> float:
    """Return a relevance score for a single file."""
    score = 0.0

    # 1) Path/filename match (higher weight)
    rel = filepath.replace(repo_path, "").replace("\\", "/").lstrip("/")
    rel_lower = rel.lower()
    for qt in question_tokens:
        if qt in rel_lower:
            score += 3.0

    # 2) Skip unreadable / huge / binary files
    ext = os.path.splitext(filepath)[1].lower()
    if ext in _SKIP_EXTENSIONS:
        return score

    try:
        size = os.path.getsize(filepath)
        if size > _MAX_FILE_BYTES:
            return score

        # Read the file up to _CONTENT_CHARS
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            preview = f.read(_CONTENT_CHARS).lower()
        
        # Substring match in the file content
        for qt in question_tokens:
            count = preview.count(qt)
            if count > 0:
                score += min(count * 1.0, 5.0)  # cap at 5 points per keyword
                
    except Exception:
        pass

    return score


def get_relevant_files(question: str, files: list[str], repo_path: str, dependencies: list[tuple], top_k: int = 3) -> list[dict]:
    """
    Return relevant files using adaptive graph-based context expansion.
    """
    question_tokens = _tokenize(question)
    if not question_tokens:
        return []

    # 1. Score all files initially
    file_scores = {}
    for f in files:
        s = _score_file(question_tokens, f, repo_path)
        if s > 0:
            file_scores[f] = s

    if not file_scores:
        return []

    # 2. Select initial seeds
    scored = sorted(file_scores.items(), key=lambda x: x[1], reverse=True)
    seeds = [f for f, s in scored[:top_k]]
    
    # 3. Graph-based expansion (1 hop)
    expanded_set = set(seeds)
    for f in seeds:
        f_short = f.replace(repo_path, "").replace("\\", "/").lstrip("/")
        for src, tgt in dependencies:
            if tgt in f_short:  # f is imported by src
                for src_file in files:
                    if src in src_file.replace("\\", "/"):
                        expanded_set.add(src_file)
            if src in f_short:  # f imports tgt
                for tgt_file in files:
                    if tgt in tgt_file.replace("\\", "/"):
                        expanded_set.add(tgt_file)

    # 4. Score expanded files and sort
    final_scored = []
    for f in expanded_set:
        s = file_scores.get(f, _score_file(question_tokens, f, repo_path))
        # Give a slight boost for being structurally related
        final_scored.append((s + 0.5, f))
    
    final_scored.sort(key=lambda x: x[0], reverse=True)

    # 5. Collect content until context budget is reached
    results = []
    total_chars = 0
    CONTEXT_BUDGET_CHARS = 12000

    for _, filepath in final_scored:
        rel = filepath.replace(repo_path, "").replace("\\", "/").lstrip("/")
        content = _read_file_content(filepath)
        if not content.strip():
            continue
            
        results.append({"path": rel, "content": content})
        total_chars += len(content)
        
        if total_chars > CONTEXT_BUDGET_CHARS:
            break

    return results


def _read_top_files(files: list[str], repo_path: str, top_k: int) -> list[dict]:
    """Fallback: return the first top_k readable files."""
    results = []
    for f in files[:top_k * 3]:
        ext = os.path.splitext(f)[1].lower()
        if ext in _SKIP_EXTENSIONS:
            continue
        try:
            if os.path.getsize(f) > _MAX_FILE_BYTES:
                continue
        except Exception:
            continue
        rel = f.replace(repo_path, "").replace("\\", "/").lstrip("/")
        results.append({"path": rel, "content": _read_file_content(f)})
        if len(results) >= top_k:
            break
    return results


def _read_file_content(filepath: str) -> str:
    """Read file, return first _CONTENT_CHARS characters."""
    try:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(_CONTENT_CHARS)
    except Exception:
        return ""
