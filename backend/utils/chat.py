import ollama
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

        response = ollama.chat(
            model="llama3",
            messages=[{"role": "user", "content": prompt}]
        )
        return response["message"]["content"]

    except Exception as e:
        return f"Error answering question: {e}"


# ─────────────────────────────────────────────────────────────
# Advanced RAG-powered ask
# ─────────────────────────────────────────────────────────────
def ask_code(question: str, repo_path: str, files: list[str]) -> dict:
    """
    Ask a natural-language question about the repo.

    1. Retrieve the top-K most relevant files via keyword scoring.
    2. Build a rich prompt with actual code snippets.
    3. Call Ollama llama3.
    4. Return { answer, referenced_files }.
    """
    try:
        relevant = get_relevant_files(question, files, repo_path, top_k=5)

        # Build the code context block
        code_context = ""
        referenced_files = []
        for item in relevant:
            if item["content"].strip():
                code_context += f"\n\n=== {item['path']} ===\n{item['content']}"
                referenced_files.append(item["path"])

        if not code_context.strip():
            code_context = "(No readable source files found for this question.)"

        system_prompt = (
            "You are a senior software engineer performing a code review. "
            "Answer ONLY based on the code snippets provided below. "
            "When citing specific logic, always mention the filename. "
            "Format code examples with triple backticks. "
            "If the answer cannot be determined from the code, say so clearly."
        )

        user_prompt = f"""
The developer is asking about their codebase:

QUESTION: {question}

RELEVANT CODE FILES:
{code_context}

Please provide a clear, accurate answer based on the code above.
"""

        response = ollama.chat(
            model="llama3",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ]
        )

        answer = response["message"]["content"]
        return {"answer": answer, "referenced_files": referenced_files}

    except Exception as e:
        return {
            "answer": f"Error communicating with Ollama: {e}. Make sure Ollama is running with `ollama serve` and llama3 is pulled.",
            "referenced_files": []
        }