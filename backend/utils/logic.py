import os


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