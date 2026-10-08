import os
import json

def analyze_compatibility(repo_path):
    reqs = {
        "Operating System": "Any (Linux/macOS/Windows)",
        "Languages": [],
        "Package Managers": [],
        "Required Services": [],
    }

    issues = []
    suggestions = []
    
    # 1. Search for configuration files (top 3 levels deep)
    found_files = {}
    for root, dirs, files in os.walk(repo_path):
        depth = root[len(repo_path):].count(os.sep)
        if depth > 2:
            dirs.clear() # stop descending
            continue
            
        for file in files:
            if file in ["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml", 
                        "requirements.txt", "Pipfile", "pyproject.toml", ".python-version", ".nvmrc",
                        "docker-compose.yml", "Dockerfile", "go.mod", "pom.xml", "build.gradle"]:
                found_files[file] = os.path.join(root, file)

    # 2. Analyze Node.js
    if "package.json" in found_files:
        reqs["Languages"].append("Node.js")
        
        # Check locks for package manager
        if "yarn.lock" in found_files and "package-lock.json" in found_files:
            issues.append("Multiple lock files found (yarn.lock and package-lock.json). This can cause dependency conflicts.")
            suggestions.append("Remove one of the lock files to enforce a single package manager.")
        elif "yarn.lock" in found_files:
            reqs["Package Managers"].append("yarn")
            suggestions.append("Run `yarn install` to install dependencies.")
        elif "pnpm-lock.yaml" in found_files:
            reqs["Package Managers"].append("pnpm")
            suggestions.append("Run `pnpm install` to install dependencies.")
        else:
            reqs["Package Managers"].append("npm")
            suggestions.append("Run `npm install` to install dependencies.")

        try:
            with open(found_files["package.json"], 'r', encoding='utf-8') as f:
                pkg = json.load(f)
                
                # Check required node version
                node_req = pkg.get("engines", {}).get("node")
                if node_req:
                    suggestions.append(f"Requires Node.js version: {node_req}")
                    
                # Check for required databases/services
                deps = str(pkg.get("dependencies", {})) + str(pkg.get("devDependencies", {}))
                if "mongoose" in deps or "mongodb" in deps:
                    reqs["Required Services"].append("MongoDB")
                if "redis" in deps:
                    reqs["Required Services"].append("Redis")
                if "pg" in deps or "sequelize" in deps:
                    reqs["Required Services"].append("PostgreSQL")
                    
                # Check scripts
                scripts = pkg.get("scripts", {})
                if "dev" in scripts:
                    suggestions.append("npm run dev")
                elif "start" in scripts:
                    suggestions.append("npm start")
                    
        except Exception:
            pass

    if ".nvmrc" in found_files:
        try:
            with open(found_files[".nvmrc"], 'r', encoding='utf-8') as f:
                ver = f.read().strip()
                suggestions.append(f"Node version specified in .nvmrc: {ver}. Use `nvm use` to switch.")
        except Exception: pass

    # 3. Analyze Python
    if any(f in found_files for f in ["requirements.txt", "Pipfile", "pyproject.toml"]):
        reqs["Languages"].append("Python")
        
        if "Pipfile" in found_files:
            reqs["Package Managers"].append("pipenv")
            suggestions.append("pipenv install")
            try:
                with open(found_files["Pipfile"], 'r', encoding='utf-8') as f:
                    for line in f:
                        if "python_version" in line:
                            ver = line.split("=")[1].strip().strip('"').strip("'")
                            suggestions.append(f"Requires Python version: {ver}")
            except Exception: pass
        elif "pyproject.toml" in found_files:
            reqs["Package Managers"].append("poetry")
            suggestions.append("poetry install")
        elif "requirements.txt" in found_files:
            reqs["Package Managers"].append("pip")
            suggestions.append("pip install -r requirements.txt")
            try:
                with open(found_files["requirements.txt"], 'r', encoding='utf-8') as f:
                    content = f.read().lower()
                    if "psycopg2" in content: reqs["Required Services"].append("PostgreSQL")
                    if "pymongo" in content: reqs["Required Services"].append("MongoDB")
                    if "redis" in content: reqs["Required Services"].append("Redis")
            except Exception: pass

    if ".python-version" in found_files:
        try:
            with open(found_files[".python-version"], 'r', encoding='utf-8') as f:
                ver = f.read().strip()
                suggestions.append(f"Python version specified in .python-version: {ver}. Use `pyenv` to manage versions.")
        except Exception: pass

    # 4. Analyze Docker
    if "docker-compose.yml" in found_files:
        suggestions.append("docker-compose up")
        reqs["Required Services"].append("Docker Compose")
    elif "Dockerfile" in found_files:
        suggestions.append("docker build -t app . && docker run -p 8080:8080 app")
        reqs["Required Services"].append("Docker")
        
    # Formatting fixes
    reqs["Languages"] = list(set(reqs["Languages"])) or ["Unknown"]
    reqs["Package Managers"] = list(set(reqs["Package Managers"])) or ["Unknown"]
    reqs["Required Services"] = list(set(reqs["Required Services"])) or ["None detected"]
    
    if not reqs["Languages"] or reqs["Languages"] == ["Unknown"]:
        issues.append("Could not confidently identify the primary language or package manager.")
        suggestions.append("Check for manual installation instructions in the README.md.")

    frontend_reqs = {
        "Operating System": reqs["Operating System"],
        "Language": ", ".join(reqs["Languages"]),
        "Package Manager": ", ".join(reqs["Package Managers"]),
        "Required Services": ", ".join(reqs["Required Services"])
    }

    # Filter out commands from suggestions for the command box
    commands = [s for s in suggestions if s.startswith(("npm ", "yarn ", "pnpm ", "pip ", "pipenv ", "poetry ", "docker", "docker-compose"))]
    text_suggestions = [s for s in suggestions if s not in commands]

    return {
        "requirements": frontend_reqs,
        "issues": issues,
        "suggestions": text_suggestions,
        "commands": "\n".join(commands)
    }
