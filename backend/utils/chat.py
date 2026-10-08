from utils import gemini
from utils.code_search import get_relevant_files


# ─────────────────────────────────────────────────────────────
# Legacy: kept for backward compatibility with /chat endpoint
# ─────────────────────────────────────────────────────────────
def ask_repo(question, explanations):
    try:
        context = ""
        for file, desc in explanations.get("file_explanations", {}).items():
            context += f"{file}: {desc}\n"

        prompt = f"""
        You are an AI assistant helping understand a codebase.

        Project summary:
        {explanations.get("project_summary", "")}

        File explanations:
        {context}

        Question:
        {question}

        Answer clearly in simple terms.
        """

        if not gemini.GEMINI_AVAILABLE:
            return "AI features are unavailable. Set GEMINI_API_KEY in backend/.env to enable."
        return gemini.generate(prompt)

    except Exception as e:
        return f"Error answering question: {e}"


# ─────────────────────────────────────────────────────────────
# Advanced RAG-powered ask
# ─────────────────────────────────────────────────────────────
def ask_code(question: str, repo_path: str, files: list[str], dependencies: list[tuple]) -> dict:
    """
    Ask a natural-language question about the repo.

    1. Retrieve the top-K most relevant files via keyword scoring.
    2. Build a rich prompt with actual code snippets.
    3. Call Gemini.
    4. Return { answer, referenced_files }.
    """
    try:
        relevant = get_relevant_files(question, files, repo_path, dependencies, top_k=3)

        # Build the code context block
        code_context = ""
        referenced_files = []
        for item in relevant:
            if item["content"].strip():
                code_context += f"\n\n=== {item['path']} ===\n{item['content']}"
                referenced_files.append(item["path"])

        if not code_context.strip():
            # If no files found, provide the list of all files as context
            repo_tree = "\n".join([f.replace(repo_path, "").replace("\\", "/").lstrip("/") for f in files])
            # Trim tree if it's insanely large
            if len(repo_tree) > 2000:
                repo_tree = repo_tree[:2000] + "\n... (truncated)"
            
            code_context = f"(No highly relevant source code files found for this exact question.)\n\nHowever, here is the entire repository file structure to help you infer the answer:\n\n{repo_tree}"

        system_prompt = (
            "You are a senior software engineer performing a code review. "
            "Answer ONLY based on the code snippets or file structure provided below. "
            "When citing specific logic, always mention the filename. "
            "Format code examples with triple backticks. "
            "If the answer cannot be determined from the context, say so clearly."
        )

        user_prompt = f"""
The developer is asking about their codebase:

QUESTION: {question}

RELEVANT CODE/CONTEXT:
{code_context}

Please provide a clear, accurate answer based on the context above.
"""

        if not gemini.GEMINI_AVAILABLE:
            return {
                "answer": "AI features require GEMINI_API_KEY to be set in backend/.env. The analysis features above still work without AI.",
                "referenced_files": referenced_files
            }

        answer = gemini.generate(user_prompt, system=system_prompt)
        return {"answer": answer, "referenced_files": referenced_files}

    except Exception as e:
        return {
            "answer": f"Error communicating with Gemini: {e}. Check that GEMINI_API_KEY in backend/.env is valid.",
            "referenced_files": []
        }