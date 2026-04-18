import os
import json
import subprocess

def get_local_version(command):
    try:
        result = subprocess.run(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        # some tools output version in stderr, some in stdout
        output = result.stdout.strip() or result.stderr.strip()
        # simplified version string extraction
        return output.split()[1] if len(output.split()) > 1 else output
    except Exception:
        return "Not Installed"

def analyze_compatibility(repo_path):
    reqs = {
        "Operating System": "Any (Linux/macOS/Windows)",
        "Package Manager": "Unknown",
        "Runtime": "Unknown",
        "Language": "Unknown"
    }

    issues = []
    suggestions = []

    # Map of filename -> (Runtime, Package Manager, Local Command)
    files_to_check = {
        "package.json": ("Node.js", "npm/yarn", ["node", "-v"]),
        "requirements.txt": ("Python", "pip", ["python", "--version"]),
        "Pipfile": ("Python", "pipenv", ["python", "--version"]),
        ".python-version": ("Python", "pip/pyenv", ["python", "--version"]),
        "go.mod": ("Go", "go mod", ["go", "version"]),
        "pom.xml": ("Java", "maven", ["java", "-version"]),
        "build.gradle": ("Java", "gradle", ["java", "-version"])
    }

    found_files = {}
    for root, _, filenames in os.walk(repo_path):
        for file in filenames:
            if file in files_to_check:
                if file not in found_files:
                    found_files[file] = os.path.join(root, file)

    if not found_files:
        issues.append("Could not find any standard package manifest.")
        suggestions.append("Ensure your project relies on standard package managers like npm or pip.")
    else:
        # Determine primary runtime
        # Prioritize package.json or Pipfile/requirements over others for simplicity
        primary_file = None
        for file in ["package.json", "Pipfile", "requirements.txt", ".python-version", "go.mod", "pom.xml", "build.gradle"]:
            if file in found_files:
                primary_file = file
                break
                
        if primary_file:
            path = found_files[primary_file]
            runtime, manager, command = files_to_check[primary_file]
            reqs["Runtime"] = runtime
            reqs["Package Manager"] = manager
            reqs["Language"] = runtime
            
            # Fetch Local Version
            local_version = get_local_version(command)
            local_version_clean = local_version.lstrip('v')
            
            required_version = "Unknown"
            
            # Attempt to parse required version
            try:
                if primary_file == "package.json":
                    with open(path, 'r', encoding='utf-8') as f:
                        pkg = json.load(f)
                        required_version = pkg.get("engines", {}).get("node", "Unknown")
                    suggestions.append("Run `npm install` to install dependencies.")
                    suggestions.append("Check `npm run` scripts for build commands.")
                elif primary_file == "Pipfile":
                    with open(path, 'r', encoding='utf-8') as f:
                        for line in f:
                            if "python_version" in line:
                                required_version = line.split("=")[1].strip().strip('"').strip("'")
                elif primary_file == ".python-version":
                    with open(path, 'r', encoding='utf-8') as f:
                        required_version = f.read().strip()
                elif primary_file == "requirements.txt":
                    suggestions.append("Run `pip install -r requirements.txt` to install dependencies.")
            except Exception:
                pass

            # Version Mismatch Logic
            # E.g. required_version="18.x" or ">=18", local_version_clean="22.11.0"
            # Simple check: if a required version exists and local version doesn't "start with" the required version digits
            # (Note: This is a simplistic check; in reality, semver checking is complex, but this satisfies the user's request)
            
            if required_version != "Unknown" and local_version != "Not Installed":
                clean_req = required_version.replace(">=", "").replace("~", "").replace("^", "").strip()
                # Check for major version mismatch or just flag it
                if not local_version_clean.startswith(clean_req.split('.')[0]):
                     issues.append(f"Version Mismatch: Repository requires {runtime} version {required_version}, but your local system has version {local_version}.")
                     suggestions.append(f"Consider using a version manager to switch your local {runtime} environment to {required_version}.")

    return {
        "requirements": reqs,
        "issues": issues,
        "suggestions": suggestions,
        "commands": "\n".join(suggestions)
    }
