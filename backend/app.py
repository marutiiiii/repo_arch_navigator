import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from utils.graph import build_graph_data
from utils.explainer import generate_explanations
from utils.chat import ask_repo, ask_code
from utils.clone_repo import clone_repository
from utils.parser import get_files, extract_dependencies
from utils.logic import (
    detect_entry_point,
    calculate_importance,
    tag_files,
    find_dead_code,
    build_file_tree,
    detect_roles,
    trace_flows,
    find_circular_dependencies
)
from utils.compatibility import analyze_compatibility
from utils.git_diff import get_git_changes
from utils.dead_code import analyze_dead_code
from utils.environment import identify_environment
from flask import redirect
from utils.auth import (
    get_github_login_url, handle_github_callback,
    get_google_login_url, handle_google_callback,
    get_current_user, FRONTEND_URL
)

app = Flask(__name__)

# Allow CORS from the configured frontend URL (Vercel or localhost)
CORS(app, resources={
    r"/*": {
        "origins": [
            FRONTEND_URL,
            "http://localhost:8080",
            "http://127.0.0.1:8080"
        ],
        "supports_credentials": True
    }
})

# ─────────────────────────────────────────
# Health check
# ─────────────────────────────────────────
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200


# ─────────────────────────────────────────
# Auth endpoints
# ─────────────────────────────────────────
@app.route('/auth/github/login', methods=['GET'])
def github_login():
    return redirect(get_github_login_url())

@app.route('/auth/github/callback', methods=['GET'])
def github_callback():
    code = request.args.get('code')
    if code:
        handle_github_callback(code)
    return redirect(FRONTEND_URL)

@app.route('/auth/google/login', methods=['GET'])
def google_login():
    return redirect(get_google_login_url())

@app.route('/auth/google/callback', methods=['GET'])
def google_callback():
    code = request.args.get('code')
    if code:
        handle_google_callback(code)
    return redirect(FRONTEND_URL)

@app.route('/auth/me', methods=['GET'])
def auth_me():
    return jsonify(get_current_user()), 200

@app.route('/auth/logout', methods=['POST'])
def auth_logout():
    user = get_current_user()
    user["logged_in"] = False
    user["profile"] = None
    user["repos"] = []
    user["provider"] = None
    return jsonify({"success": True}), 200


# ─────────────────────────────────────────
# Main analysis endpoint
# ─────────────────────────────────────────
@app.route('/analyze', methods=['POST'])
def analyze_repo():
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get("repo_url", "").strip()

        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        # 1) Clone Statelessly
        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repository"}), 500

        # 2) Parse
        files = get_files(repo_path)
        if not files:
            return jsonify({"error": "No source files found in the repository"}), 422

        dependencies = extract_dependencies(files)

        # 3) Feature Intelligence
        entry      = detect_entry_point(files)
        scores     = calculate_importance(files, dependencies)
        tags       = tag_files(scores)
        roles      = detect_roles(files)
        flows      = trace_flows(files, dependencies)
        dead       = find_dead_code(files, dependencies)
        file_tree  = build_file_tree(files, repo_path)
        graph_data = build_graph_data(files, dependencies, scores, tags, entry, repo_path)
        circular   = find_circular_dependencies(files, dependencies)
        environment_info = identify_environment(repo_path)

        # 4) AI explanations — only run if caller requests it (?explain=true)
        #    Skipped by default because Ollama can take 60+ seconds on large repos.
        want_explain = request.args.get("explain", "false").lower() == "true"
        if want_explain:
            try:
                explanations = generate_explanations(files, scores, entry)
            except Exception:
                explanations = {"file_explanations": {}, "learning_path": [], "project_summary": "AI unavailable."}
        else:
            explanations = {"file_explanations": {}, "learning_path": [], "project_summary": ""}

        # 5) Build flat analysis list with short paths
        def short(p):
            return p.replace(repo_path, "").replace("\\", "/").lstrip("/")

        analysis = [
            {
                "file":     short(f),
                "score":    scores.get(f, 0),
                "tag":      tags.get(f, "LOW"),
                "role":     roles.get(f, "Backend"),
                "is_entry": f == entry,
                "is_dead":  f in dead,
            }
            for f in files
        ]

        # 6) Shorten paths in explanations
        short_explanations = {
            short(k): v
            for k, v in explanations.get("file_explanations", {}).items()
        }

        return jsonify({
            "repo_url":          repo_url,
            "entry_point":       short(entry) if entry else None,
            "total_files":       len(files),
            "total_dependencies": len(dependencies),
            "analysis":          analysis,
            "flows":             [{ "name": flow["name"], "steps": [short(step) for step in flow["steps"]] } for flow in flows],
            "file_tree":         file_tree,
            "environment":       environment_info,
            "circular_dependencies": [[short(step) for step in cycle] for cycle in circular],
            "graph":             graph_data,
            "explanations": {
                "file_explanations": short_explanations,
                "learning_path": [short(f) for f in explanations.get("learning_path", [])],
                "project_summary": explanations.get("project_summary", ""),
            },
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'temp_dir' in locals() and temp_dir:
            temp_dir.cleanup()


# ─────────────────────────────────────────
# Chat endpoint
# ─────────────────────────────────────────
@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json(silent=True) or {}
        question     = data.get("question", "").strip()
        explanations = data.get("explanations", {})

        if not question:
            return jsonify({"error": "question is required"}), 400

        answer = ask_repo(question, explanations)
        return jsonify({"answer": answer}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Compatibility endpoint
# ─────────────────────────────────────────
@app.route('/compatibility', methods=['POST'])
def compatibility():
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get("repo_url", "").strip()
        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repo for compatibility check"}), 500

        try:
            report = analyze_compatibility(repo_path)
            return jsonify(report), 200
        finally:
            temp_dir.cleanup()

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Changes endpoint
# ─────────────────────────────────────────
@app.route('/changes', methods=['POST'])
def changes():
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get("repo_url", "").strip()
        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repo for changes check"}), 500

        try:
            changes_data = get_git_changes(repo_path)
            return jsonify(changes_data), 200
        finally:
            temp_dir.cleanup()

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Advanced Ask the Code endpoint (RAG-powered)
# ─────────────────────────────────────────
@app.route('/ask', methods=['POST'])
def ask_endpoint():
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get("repo_url", "").strip()
        question = data.get("question", "").strip()

        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400
        if not question:
            return jsonify({"error": "question is required"}), 400

        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repo for ask code"}), 500

        try:
            files = get_files(repo_path)
            dependencies = extract_dependencies(files)
            result = ask_code(question, repo_path, files, dependencies)
            return jsonify(result), 200
        finally:
            temp_dir.cleanup()

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# Dead Code endpoint
# ─────────────────────────────────────────
@app.route('/dead-code', methods=['POST'])
def dead_code():
    try:
        data = request.get_json(silent=True) or {}
        repo_url = data.get("repo_url", "").strip()
        if not repo_url:
            return jsonify({"error": "repo_url is required"}), 400

        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repo for dead-code analysis"}), 500

        try:
            files = get_files(repo_path)
            dependencies = extract_dependencies(files)
            report = analyze_dead_code(files, dependencies, repo_path)
            return jsonify(report), 200
        finally:
            temp_dir.cleanup()

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
# File Content endpoint (for dead-code preview)
# ─────────────────────────────────────────
@app.route('/file-content', methods=['POST'])
def file_content():
    try:
        data = request.get_json(silent=True) or {}
        repo_url  = data.get("repo_url", "").strip()
        file_path = data.get("file_path", "").strip()

        if not repo_url or not file_path:
            return jsonify({"error": "repo_url and file_path are required"}), 400

        temp_dir, repo_path = clone_repository(repo_url)
        if not repo_path:
            return jsonify({"error": "Failed to clone repo for file-content preview"}), 500

        try:
            # Resolve the absolute path, guard against path traversal
            abs_file = os.path.normpath(os.path.join(repo_path, file_path))
            if not abs_file.startswith(os.path.normpath(repo_path)):
                return jsonify({"error": "Access denied"}), 403

            if not os.path.isfile(abs_file):
                return jsonify({"error": "File not found"}), 404

            try:
                with open(abs_file, "r", encoding="utf-8", errors="replace") as f:
                    content = f.read()
            except Exception as e:
                return jsonify({"error": str(e)}), 500

            return jsonify({"content": content}), 200
        finally:
            temp_dir.cleanup()

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)