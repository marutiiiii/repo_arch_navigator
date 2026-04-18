import os

def analyze_compatibility(repo_path):
    reqs = {
        "Operating System": "Any (Linux/macOS/Windows)",
        "Package Manager": "Unknown",
        "Runtime": "Unknown",
        "Language": "Unknown"
    }

    issues = []
    suggestions = []

    files_to_check = {
        "package.json": ("Node.js", "npm/yarn"),
        "requirements.txt": ("Python", "pip"),
        "Pipfile": ("Python", "pipenv"),
        "go.mod": ("Go", "go mod"),
        "pom.xml": ("Java", "maven"),
        "build.gradle": ("Java", "gradle")
    }

    found_files = []
    for root, _, filenames in os.walk(repo_path):
        for file in filenames:
            if file in files_to_check:
                found_files.append((os.path.join(root, file), file))

    if not found_files:
        issues.append("Could not find any standard package manifest.")
        suggestions.append("Ensure your project relies on standard package managers like npm or pip.")
    else:
        # Just grab the first one for simplicity, or iterate
        for path, name in found_files:
            runtime, manager = files_to_check[name]
            reqs["Runtime"] = runtime
            reqs["Package Manager"] = manager
            reqs["Language"] = runtime

            if name == "package.json":
                suggestions.append("Run `npm install` to install dependencies.")
                suggestions.append("Check `npm run` scripts for build commands.")
            elif name == "requirements.txt":
                suggestions.append("Run `pip install -r requirements.txt` to install dependencies.")

            break # just take primary for now

    return {
        "requirements": reqs,
        "issues": issues,
        "suggestions": suggestions,
        "commands": "\n".join(suggestions)
    }
