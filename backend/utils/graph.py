"""
graph.py  —  Build graph data (nodes + edges) as JSON.

The data is returned directly from the /analyze endpoint so the
React frontend can render it using React Flow (or similar).

Node shape:
    { id, label, type, score, tag, is_entry, is_dead }

Edge shape:
    { id, source, target }
"""

import os


def _module_label(abs_path: str, repo_path: str) -> str:
    """Return a short, human-readable label for a file path."""
    rel = abs_path.replace(repo_path, "").replace("\\", "/").lstrip("/")
    return rel


def build_graph_data(files, dependencies, scores, tags, entry, repo_path=""):
    """
    Return { nodes: [...], edges: [...] } ready for the React frontend.
    """
    nodes = []
    edges = []
    seen_edges: set = set()

    # Build a lookup: short module name → full abs path
    file_set = set(files)
    path_map: dict[str, str] = {}
    for f in files:
        base = os.path.splitext(os.path.basename(f))[0]  # e.g. "app"
        path_map[base] = f
        # also map the full relative path without extension
        rel = f.replace(repo_path, "").replace("\\", "/").lstrip("/")
        rel_no_ext = os.path.splitext(rel)[0]
        path_map[rel_no_ext] = f

    # ── Nodes ────────────────────────────────────────────────────────────
    for f in files:
        label = _module_label(f, repo_path) if repo_path else f.replace("\\", "/")
        node_type = "entry" if f == entry else "file"
        nodes.append({
            "id":       f,
            "label":    label,
            "type":     node_type,
            "score":    scores.get(f, 0),
            "tag":      tags.get(f, "LOW"),
            "is_entry": f == entry,
            "is_dead":  f not in {src for src, _ in dependencies} and f not in {
                path_map.get(dest, "") for _, dest in dependencies
            },
        })

    # ── Edges ────────────────────────────────────────────────────────────
    for src, dest in dependencies:
        if src not in file_set:
            continue

        # Try to resolve destination to a known file
        dest_file = path_map.get(dest) or path_map.get(dest.replace("/", os.sep))
        if not dest_file or dest_file == src:
            continue

        edge_key = (src, dest_file)
        if edge_key in seen_edges:
            continue
        seen_edges.add(edge_key)

        edges.append({
            "id":     f"e_{len(edges)}",
            "source": src,
            "target": dest_file,
        })

    return {"nodes": nodes, "edges": edges}
