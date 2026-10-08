import os
import ast
import re


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _read(path: str) -> str | None:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read()
    except Exception:
        return None


def _short(path: str, repo_path: str) -> str:
    return path.replace(repo_path, "").replace("\\", "/").lstrip("/")


def _line_count(path: str) -> int:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0


# ─────────────────────────────────────────────────────────────
# Python AST snippet-level analysis
# ─────────────────────────────────────────────────────────────

def _analyze_python_file(path: str) -> dict:
    """
    Parse a Python file with ast and return:
      - defined: {name -> {lineno, end_lineno, is_private}}
      - used:    set of names referenced in Calls / Attributes / Names
    """
    src = _read(path)
    if not src:
        return {"defined": {}, "used": set()}

    try:
        tree = ast.parse(src, filename=path)
    except SyntaxError:
        return {"defined": {}, "used": set()}

    defined: dict[str, dict] = {}
    used: set[str] = set()

    for node in ast.walk(tree):
        # Collect definitions
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            defined[node.name] = {
                "lineno": node.lineno,
                "end_lineno": getattr(node, "end_lineno", node.lineno),
                "kind": "function",
                "is_private": node.name.startswith("_"),
            }
        elif isinstance(node, ast.ClassDef):
            defined[node.name] = {
                "lineno": node.lineno,
                "end_lineno": getattr(node, "end_lineno", node.lineno),
                "kind": "class",
                "is_private": node.name.startswith("_"),
            }
        # Collect usages
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name):
                used.add(node.func.id)
            elif isinstance(node.func, ast.Attribute):
                used.add(node.func.attr)
        elif isinstance(node, ast.Name):
            used.add(node.id)
        elif isinstance(node, ast.Attribute):
            used.add(node.attr)

    return {"defined": defined, "used": used}


# ─────────────────────────────────────────────────────────────
# JS/TS exported symbol detection (regex-based)
# ─────────────────────────────────────────────────────────────

_JS_EXPORT_RE = re.compile(
    r'export\s+(?:default\s+)?(?:function|class|const|let|var)\s+(\w+)'
)
_JS_USAGE_RE = re.compile(r'\b(\w+)\b')


def _analyze_js_file(path: str) -> dict:
    """
    Light-weight regex scan for exported JS/TS symbols and all identifiers used
    across a set of other files.
    """
    src = _read(path)
    if not src:
        return {"defined": {}, "used": set()}

    defined: dict[str, dict] = {}
    for m in _JS_EXPORT_RE.finditer(src):
        name = m.group(1)
        # Approximate line number by counting newlines before match
        lineno = src[: m.start()].count("\n") + 1
        defined[name] = {
            "lineno": lineno,
            "end_lineno": lineno,
            "kind": "export",
            "is_private": False,
        }

    used: set[str] = set(_JS_USAGE_RE.findall(src))
    return {"defined": defined, "used": used}


# ─────────────────────────────────────────────────────────────
# Dead-file detection (reachability from entry points)
# ─────────────────────────────────────────────────────────────

def _find_dead_files(files: list[str], dependencies: list[tuple]) -> list[str]:
    """Files that are never the target of any import."""
    imported: set[str] = set()
    for _src, dest in dependencies:
        for f in files:
            if dest in f.replace("\\", "/"):
                imported.add(f)

    # Config / doc / test files are not 'imported' but not really dead
    skip_exts = {".json", ".yaml", ".yml", ".md", ".txt", ".rst", ".env",
                 ".ini", ".cfg", ".sql", ".sqlite", ".db"}
    result = []
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if f not in imported and ext not in skip_exts:
            result.append(f)
    return result


# ─────────────────────────────────────────────────────────────
# Main public function
# ─────────────────────────────────────────────────────────────

def analyze_dead_code(files: list[str], dependencies: list[tuple], repo_path: str) -> dict:
    """
    Returns:
    {
        "summary": {
            "dead_files": int,
            "dead_snippets": int,
            "total_lines_recoverable": int,
        },
        "dead_files": [
            { "file": str, "lines": int, "confidence": int }
        ],
        "dead_snippets": [
            {
                "file": str,
                "name": str,
                "kind": "function" | "class" | "export",
                "lineno": int,
                "end_lineno": int,
                "lines": int,
                "is_private": bool,
                "confidence": int,   # 0-100
            }
        ],
    }
    """
    dead_files_paths = _find_dead_files(files, dependencies)

    # Build a global usage pool across the whole repo so we can
    # check cross-file references.
    global_used: set[str] = set()
    file_data: dict[str, dict] = {}

    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext == ".py":
            data = _analyze_python_file(f)
        elif ext in {".js", ".ts", ".jsx", ".tsx"}:
            data = _analyze_js_file(f)
        else:
            data = {"defined": {}, "used": set()}
        file_data[f] = data
        global_used |= data["used"]

    # ── Dead snippets ──────────────────────────────────────────
    dead_snippets = []
    for f in files:
        ext = os.path.splitext(f)[1].lower()
        if ext not in {".py", ".js", ".ts", ".jsx", ".tsx"}:
            continue

        data = file_data[f]
        for name, meta in data["defined"].items():
            if name in global_used:
                continue
            # Skip dunder methods — always considered "used" by Python internals
            if name.startswith("__") and name.endswith("__"):
                continue

            snippet_lines = meta["end_lineno"] - meta["lineno"] + 1

            # Confidence heuristic
            if meta["is_private"]:
                confidence = 92
            elif meta["kind"] == "export":
                confidence = 60   # could be used by external consumers
            else:
                confidence = 80

            dead_snippets.append({
                "file":       _short(f, repo_path),
                "name":       name,
                "kind":       meta["kind"],
                "lineno":     meta["lineno"],
                "end_lineno": meta["end_lineno"],
                "lines":      snippet_lines,
                "is_private": meta["is_private"],
                "confidence": confidence,
            })

    # Sort by confidence desc, then by file
    dead_snippets.sort(key=lambda x: (-x["confidence"], x["file"]))

    # ── Dead files ─────────────────────────────────────────────
    dead_files_out = []
    total_lines = 0
    for f in dead_files_paths:
        lc = _line_count(f)
        total_lines += lc
        dead_files_out.append({
            "file":       _short(f, repo_path),
            "lines":      lc,
            "confidence": 75,   # file-level detection is heuristic
        })

    total_lines += sum(s["lines"] for s in dead_snippets)

    return {
        "summary": {
            "dead_files":              len(dead_files_out),
            "dead_snippets":           len(dead_snippets),
            "total_lines_recoverable": total_lines,
        },
        "dead_files":    dead_files_out,
        "dead_snippets": dead_snippets,
    }
