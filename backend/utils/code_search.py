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

    # 1) Path/filename tokens
    rel = filepath.replace(repo_path, "").replace("\\", "/").lstrip("/")
    path_tokens = _tokenize(rel)
    score += len(question_tokens & path_tokens) * 3.0   # path match weights more

    # 2) Skip unreadable / huge / binary files
    ext = os.path.splitext(filepath)[1].lower()
    if ext in _SKIP_EXTENSIONS:
        return score

    try:
        size = os.path.getsize(filepath)
        if size > _MAX_FILE_BYTES:
            return score

        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            lines = []
            for i, line in enumerate(f):
                if i >= _PREVIEW_LINES:
                    break
                lines.append(line)

        preview = "".join(lines)
        preview_tokens = _tokenize(preview)
        score += len(question_tokens & preview_tokens) * 1.0

    except Exception:
        pass

    return score


def get_relevant_files(question: str, files: list[str], repo_path: str, top_k: int = 5) -> list[dict]:
    """
    Return a list of top_k most relevant files with their content.

    Each item: { "path": relative_path, "content": truncated_code }
    """
    question_tokens = _tokenize(question)
    if not question_tokens:
        # Fallback: just pick the top-scored files from logic module scores
        return _read_top_files(files, repo_path, top_k)

    scored = []
    for f in files:
        s = _score_file(question_tokens, f, repo_path)
        scored.append((s, f))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_k]

    results = []
    for _, filepath in top:
        rel = filepath.replace(repo_path, "").replace("\\", "/").lstrip("/")
        content = _read_file_content(filepath)
        results.append({"path": rel, "content": content})

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
