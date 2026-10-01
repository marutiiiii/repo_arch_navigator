import os

from utils import gemini


def read_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""


def ai_explain(file_name, content):
    try:
        prompt = f"""
        Explain this code file in 1-2 simple lines.

        File: {file_name}

        Code:
        {content[:1500]}
        """

        return gemini.generate(prompt).strip()

    except Exception as e:
        return "Explanation unavailable."


def generate_explanations(files, scores, entry):
    explanations = {}

    # pick top important files
    top_files = sorted(scores, key=scores.get, reverse=True)[:5]

    for file in top_files:
        content = read_file(file)
        explanations[file] = ai_explain(file, content)

    learning_path = [entry] + [f for f in top_files if f != entry]

    return {
        "file_explanations": explanations,
        "learning_path": learning_path,
        "project_summary": "Generated using Google Gemini."
    }