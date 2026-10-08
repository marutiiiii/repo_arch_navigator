import os
import json

def identify_environment(repo_path: str) -> dict:
    """
    Automatically identify runtime and environment requirements
    from project configuration and package manifests.
    """
    env_info = {
        "runtimes": [],
        "package_managers": [],
        "frameworks": [],
        "infrastructure": [],
        "has_docker": False,
        "details": {}
    }

    # 1. Check for Node.js / JS Ecosystem
    package_json_path = os.path.join(repo_path, "package.json")
    if os.path.exists(package_json_path):
        env_info["runtimes"].append("Node.js")
        env_info["package_managers"].append("npm/yarn/pnpm")
        try:
            with open(package_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
                
                if "react" in deps: env_info["frameworks"].append("React")
                if "vue" in deps: env_info["frameworks"].append("Vue")
                if "next" in deps: env_info["frameworks"].append("Next.js")
                if "express" in deps: env_info["frameworks"].append("Express")
                if "vite" in deps: env_info["frameworks"].append("Vite")
                
                env_info["details"]["node_dependencies_count"] = len(deps)
        except Exception:
            pass

    # 2. Check for Python
    req_txt_path = os.path.join(repo_path, "requirements.txt")
    pipfile_path = os.path.join(repo_path, "Pipfile")
    pyproject_path = os.path.join(repo_path, "pyproject.toml")
    
    if os.path.exists(req_txt_path) or os.path.exists(pipfile_path) or os.path.exists(pyproject_path):
        env_info["runtimes"].append("Python")
        if os.path.exists(req_txt_path):
            env_info["package_managers"].append("pip")
            try:
                with open(req_txt_path, "r", encoding="utf-8") as f:
                    content = f.read().lower()
                    if "flask" in content: env_info["frameworks"].append("Flask")
                    if "django" in content: env_info["frameworks"].append("Django")
                    if "fastapi" in content: env_info["frameworks"].append("FastAPI")
            except Exception:
                pass
        if os.path.exists(pipfile_path): env_info["package_managers"].append("pipenv")
        if os.path.exists(pyproject_path): env_info["package_managers"].append("poetry/flit")

    # 3. Check for Docker / Infrastructure
    dockerfile_path = os.path.join(repo_path, "Dockerfile")
    docker_compose_path = os.path.join(repo_path, "docker-compose.yml")
    if not os.path.exists(docker_compose_path):
        docker_compose_path = os.path.join(repo_path, "docker-compose.yaml")
        
    if os.path.exists(dockerfile_path):
        env_info["infrastructure"].append("Docker")
        env_info["has_docker"] = True
    if os.path.exists(docker_compose_path):
        env_info["infrastructure"].append("Docker Compose")
        env_info["has_docker"] = True

    # 4. Check for Go
    go_mod_path = os.path.join(repo_path, "go.mod")
    if os.path.exists(go_mod_path):
        env_info["runtimes"].append("Go")
        env_info["package_managers"].append("go modules")

    # Deduplicate lists
    env_info["runtimes"] = list(set(env_info["runtimes"]))
    env_info["package_managers"] = list(set(env_info["package_managers"]))
    env_info["frameworks"] = list(set(env_info["frameworks"]))
    env_info["infrastructure"] = list(set(env_info["infrastructure"]))

    return env_info
