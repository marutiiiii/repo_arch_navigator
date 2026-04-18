import os
import re

def get_files(repo_path):
    valid_extensions = (
    # Core programming
    ".py", ".js", ".ts", ".java", ".c", ".cpp", ".cs", ".go", ".rb", ".php",
    # Frontend / web
    ".html", ".css", ".scss", ".jsx", ".tsx",
    # Data & config
    ".json", ".yaml", ".yml", ".env", ".ini", ".cfg",
    # Database
    ".sql", ".sqlite", ".db",
    # Docs
    ".md", ".txt", ".rst",

    # Testing
    ".test.js", ".spec.js"
)
    files = []

    for root, _, filenames in os.walk(repo_path):
        for file in filenames:
            if file.endswith(valid_extensions):
                full_path = os.path.join(root, file)
                files.append(full_path)

    return files

def extract_dependencies(files):
    dependencies = []

    for file in files:
        try:
            with open(file, "r", encoding="utf-8") as f:
                content = f.read()

                # Python imports
                py_imports = re.findall(r'import (\w+)', content)
                py_from_imports = re.findall(r'from (\w+)', content)

                # JS imports
                js_imports = re.findall(r'import .* from [\'"](.*)[\'"]', content)
                js_requires = re.findall(r'require\([\'"](.*)[\'"]\)', content)

                all_imports = py_imports + py_from_imports + js_imports + js_requires

                for imp in all_imports:
                    dependencies.append((file, imp))

        except:
            continue

    return dependencies