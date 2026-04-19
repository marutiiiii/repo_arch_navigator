import os
from collections import deque


def detect_entry_point(files):
    """Return the most likely application entry point."""
    priority = ("main.py", "app.py", "index.js", "index.ts", "server.js", "server.ts")
    for name in priority:
        for file in files:
            if file.replace("\\", "/").endswith(f"/{name}"):
                return file
    return files[0] if files else None


def calculate_importance(files, dependencies):
    """Score each file by how many times it is imported/required."""
    score = {file: 0 for file in files}

    for src, dest in dependencies:
        if src in score:
            score[src] += 1
        for file in files:
            if dest in file:
                score[file] += 1

    return score


def tag_files(scores):
    """Assign a HIGH / MEDIUM / LOW tag based on the importance score."""
    tags = {}
    for file, score in scores.items():
        if score >= 5:
            tags[file] = "HIGH"
        elif score >= 2:
            tags[file] = "MEDIUM"
        else:
            tags[file] = "LOW"
    return tags


def find_dead_code(files, dependencies):
    """Return files that are never imported by anything else."""
    used = set()
    for _src, dest in dependencies:
        for file in files:
            if dest in file:
                used.add(file)

    return [f for f in files if f not in used]


def build_file_tree(files, repo_path):
    """
    Convert a flat list of absolute paths into a nested JSON tree
    that the React FileTree component can render.

    Each node is:  { name, type: "folder"|"file", children?: [...] }
    """
    root: dict = {"name": "root", "type": "folder", "children": []}

    for abs_path in files:
        # Make path relative and normalise separators
        rel = abs_path.replace(repo_path, "").replace("\\", "/").lstrip("/")
        parts = rel.split("/")

        current = root
        for i, part in enumerate(parts):
            is_last = i == len(parts) - 1

            if is_last:
                current["children"].append({"name": part, "type": "file"})
            else:
                # Find or create the folder node
                found = None
                for child in current.get("children", []):
                    if child["type"] == "folder" and child["name"] == part:
                        found = child
                        break
                if not found:
                    found = {"name": part, "type": "folder", "children": []}
                    current["children"].append(found)
                current = found

    # Return just the children of the virtual root
    return root["children"]

def detect_roles(files):
    """Assign a system role to each file based on heuristics."""
    roles = {}
    for file in files:
        f_lower = file.replace("\\", "/").lower()
        if "src/components" in f_lower or "src/pages" in f_lower or "src/views" in f_lower or f_lower.endswith((".tsx", ".jsx", ".html", ".css")):
            roles[file] = "Frontend"
        elif "db/" in f_lower or "models/" in f_lower or f_lower.endswith((".sql", ".prisma")):
            roles[file] = "Database"
        elif "ai/" in f_lower or "ml/" in f_lower or "langchain" in f_lower or f_lower.endswith(".ipynb"):
            roles[file] = "AI/ML"
        elif f_lower.endswith((".json", ".yml", ".yaml", "dockerfile", ".toml", ".ini", ".env.example", ".txt", ".md")):
            roles[file] = "Config"
        else:
            roles[file] = "Backend"
    return roles

def trace_flows(files, dependencies):
    """Find specific workflows like Auth, Login, Payment via BFS traversal."""
    flows = []
    
    triggers = {
        "Authentication": ["auth", "login", "register", "signup"],
        "Payment": ["payment", "checkout", "billing", "stripe"],
        "User Profile": ["profile", "user"],
        "Data Export": ["export", "download"]
    }
    
    # build adjacency list
    adj = {f: [] for f in files}
    for src, dest in dependencies:
        for f in files:
            if dest in f.replace("\\", "/"):
                if src in adj:
                    adj[src].append(f)

    def bfs(start_node):
        path = []
        q = deque([start_node])
        visited = set([start_node])
        while q:
            curr = q.popleft()
            path.append(curr)
            for nxt in adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    q.append(nxt)
        return path

    found_flows = set()
    for flow_name, keywords in triggers.items():
        if flow_name in found_flows: continue
        for file in files:
            f_lower = file.replace("\\", "/").lower()
            if any(f"/{k}" in f_lower or f"{k}." in f_lower for k in keywords):
                path = bfs(file)
                if len(path) > 1: # Requires at least one connected node to be a flow
                    flows.append({
                        "name": flow_name,
                        "steps": path
                    })
                    found_flows.add(flow_name)
                    break
    
    return flows