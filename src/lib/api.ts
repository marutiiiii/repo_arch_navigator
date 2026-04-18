// Base URL of the Flask backend
const BASE_URL = "http://127.0.0.1:5000";

export interface AskCodeResponse {
  answer: string;
  referenced_files: string[];
}

export interface FileAnalysis {
  file: string;
  score: number;
  tag: "HIGH" | "MEDIUM" | "LOW";
  is_entry: boolean;
  is_dead: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  score: number;
  tag: string;
  is_entry: boolean;
  is_dead: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface FileTreeNode {
  name: string;
  type: "folder" | "file";
  children?: FileTreeNode[];
}

export interface AnalysisResult {
  repo_url: string;
  entry_point: string | null;
  total_files: number;
  total_dependencies: number;
  analysis: FileAnalysis[];
  file_tree: FileTreeNode[];
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  explanations: {
    file_explanations: Record<string, string>;
    learning_path: string[];
    project_summary: string;
  };
}

export interface CompatibilityReport {
  requirements: Record<string, string>;
  issues: string[];
  suggestions: string[];
  commands: string;
}

export interface ChangeAnalysis {
  commit: {
    message: string;
    author: string;
    timestamp: string;
  };
  stats: {
    added: number;
    removed: number;
    modified: number;
  };
  diff_raw: string;
  before_content: string;
  after_content: string;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    return data.status === "ok";
  } catch {
    return false;
  }
}

export async function analyzeRepo(repoUrl: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export async function chatWithRepo(
  question: string,
  explanations: AnalysisResult["explanations"]
): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, explanations }),
  });

  if (!res.ok) {
    throw new Error("Chat request failed");
  }

  const data = await res.json();
  return data.answer ?? "";
}

export async function getCompatibility(repoUrl: string): Promise<CompatibilityReport> {
  const res = await fetch(`${BASE_URL}/compatibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export async function getChanges(repoUrl: string): Promise<ChangeAnalysis> {
  const res = await fetch(`${BASE_URL}/changes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}

export async function askCode(
  repoUrl: string,
  question: string
): Promise<AskCodeResponse> {
  const res = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_url: repoUrl, question }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  return res.json();
}
