# Repo Architecture Navigator

A full-stack repository analysis tool that lets you explore any GitHub repository's architecture, dependencies, and ask natural language questions about the codebase using AI.

## Features

- **Repository Analysis** — Clone any public GitHub repo, identify entry points, score files by importance, and detect dead code
- **Dependency Graph** — Visual SVG graph showing module dependencies color-coded by importance
- **Compatibility Report** — Detect runtime requirements and setup suggestions from package manifests
- **Change Analyzer** — View the latest Git commit diff with Before/After code comparison
- **Ask the Code** — RAG-powered natural language Q&A about the codebase using Ollama llama3

---

## Project Structure

```
repo_arch_navigator/
├── backend/          ← Flask Python API
│   ├── app.py        ← Main Flask server (CORS, all endpoints)
│   └── utils/
│       ├── clone_repo.py     ← Clones GitHub repos via gitpython
│       ├── parser.py         ← Walks files, extracts imports
│       ├── logic.py          ← Scoring, tagging, dead code, file tree builder
│       ├── graph.py          ← Graph nodes + edges JSON for frontend
│       ├── compatibility.py  ← Reads package manifests
│       ├── git_diff.py       ← Native git diff via subprocess
│       ├── code_search.py    ← Keyword RAG file retriever
│       ├── chat.py           ← Ollama llama3 integration
│       └── explainer.py      ← AI file explanations (opt-in)
│
└── src/              ← React + Vite + TypeScript frontend
    ├── pages/
    │   ├── Dashboard.tsx        ← Repo URL input + live stat cards
    │   ├── RepositoryAnalysis.tsx ← FileTree + SVG Graph + FileDetails
    │   ├── Compatibility.tsx    ← Env report + unused files
    │   ├── ChangeAnalyzer.tsx   ← Git diff viewer
    │   ├── AskCode.tsx          ← Full-screen Ollama chat page
    │   └── Settings.tsx
    ├── components/
    │   ├── repo/          ← FileTree, GraphViewer, FileDetailsCard
    │   ├── layout/        ← AppSidebar, Topbar
    │   └── ChatBubble.tsx ← Floating shortcut to /ask
    ├── context/
    │   └── RepoAnalysisContext.tsx ← Global state + chat history
    └── lib/
        └── api.ts         ← Typed fetch wrappers for all endpoints
```

---

## Backend API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Check if backend is alive |
| `POST` | `/analyze` | Clone + parse + score repo → returns full analysis JSON |
| `POST` | `/compatibility` | Detect environment requirements from manifest files |
| `POST` | `/changes` | Return latest git commit info + HEAD~1 diff |
| `POST` | `/ask` | RAG-powered Q&A using Ollama llama3 |
| `POST` | `/chat` | Legacy chat using pre-summarized explanations |

---

## Setup

### Backend

```bash
cd backend
pip install flask flask-cors gitpython ollama
python app.py
# Runs on http://localhost:5000
```

> **Requires Ollama** with `llama3` pulled:
> ```bash
> ollama pull llama3
> ollama serve
> ```

### Frontend

```bash
npm install
npm run dev
# Runs on http://localhost:8080
```

---

## How It Works

1. Enter any public GitHub URL in the Dashboard
2. The backend clones it, walks every source file, scores imports, builds a dependency graph
3. Navigate to **Repository Analysis** to explore the file tree and SVG graph
4. Go to **Ask the Code** and ask natural language questions — Ollama reads actual source files to answer
