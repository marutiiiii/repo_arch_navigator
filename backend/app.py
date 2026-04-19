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
)
from utils.compatibility import analyze_compatibility
from utils.git_diff import get_git_changes
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

        # 1) Clone
        repo_path = clone_repository(repo_url)
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
        dead       = find_dead_code(files, dependencies)
        file_tree  = build_file_tree(files, repo_path)
        graph_data = build_graph_data(files, dependencies, scores, tags, entry, repo_path)

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
            "file_tree":         file_tree,
            "graph":             graph_data,
            "explanations": {
                "file_explanations": short_explanations,
                "learning_path": [short(f) for f in explanations.get("learning_path", [])],
                "project_summary": explanations.get("project_summary", ""),
            },
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


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

        # Note: repo should already be cloned from /analyze. We'll format the local path
        base_dir = "repos"
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        repo_path = os.path.join(base_dir, repo_name)
        
        if not os.path.exists(repo_path):
             return jsonify({"error": "Repo not found locally. Please analyze it first."}), 404

        report = analyze_compatibility(repo_path)
        return jsonify(report), 200

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

        base_dir = "repos"
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        repo_path = os.path.join(base_dir, repo_name)
        
        if not os.path.exists(repo_path):
             return jsonify({"error": "Repo not found locally. Please analyze it first."}), 404

        changes_data = get_git_changes(repo_path)
        return jsonify(changes_data), 200

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

        base_dir = "repos"
        repo_name = repo_url.split("/")[-1].replace(".git", "")
        repo_path = os.path.join(base_dir, repo_name)

        if not os.path.exists(repo_path):
            return jsonify({"error": "Repo not found locally. Please analyze it first."}), 404

        # Re-scan files from disk (fast, no git needed)
        files = get_files(repo_path)

        result = ask_code(question, repo_path, files)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") != "production"
    app.run(host="0.0.0.0", port=port, debug=debug)