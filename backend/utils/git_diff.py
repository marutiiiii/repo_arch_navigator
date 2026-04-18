import subprocess
import os

def get_git_changes(repo_path):
    # Get last commit details
    try:
        commit_info = subprocess.check_output(
            ["git", "-C", repo_path, "log", "-1", "--pretty=format:%H||%an||%ad||%s"],
            text=True
        ).strip().split("||")
        
        if len(commit_info) == 4:
            commit_hash, author, timestamp, message = commit_info
        else:
            raise Exception("Invalid commit info representation")

        # Get diff between HEAD and HEAD~1
        try:
            diff_output = subprocess.check_output(
                ["git", "-C", repo_path, "diff", "HEAD~1", "HEAD"],
                text=True,
                stderr=subprocess.DEVNULL
            )
            
            # Simple stats
            added = diff_output.count("\n+") - diff_output.count("\n+++")
            removed = diff_output.count("\n-") - diff_output.count("\n---")
            modified = min(added, removed) # rough proxy
            
        except subprocess.CalledProcessError:
            diff_output = "No previous commit found to contrast."
            added = 0
            removed = 0
            modified = 0

        # Try to pull out full file contents of changed file (pick first changed file)
        # For a true full "before" and "after" we could do something like `git show HEAD~1:file`
        # Here we just pass the diff and let the UI show it or some simple stat.
        # But UI expects before/after content. We will try to get the first file that was modified.
        
        try:
            changed_files = subprocess.check_output(
                ["git", "-C", repo_path, "diff", "--name-only", "HEAD~1", "HEAD"],
                text=True,
                stderr=subprocess.DEVNULL
            ).strip().split("\n")
            
            first_file = changed_files[0] if changed_files and changed_files[0] else None
            
            if first_file:
                try:
                    before_content = subprocess.check_output(["git", "-C", repo_path, "show", f"HEAD~1:{first_file}"], text=True, stderr=subprocess.DEVNULL)
                except:
                    before_content = ""
                try:
                    after_content = subprocess.check_output(["git", "-C", repo_path, "show", f"HEAD:{first_file}"], text=True, stderr=subprocess.DEVNULL)
                except:
                    after_content = ""
            else:
                before_content = ""
                after_content = ""
        except:
            before_content = ""
            after_content = ""

        return {
            "commit": {
                "message": message,
                "author": author,
                "timestamp": timestamp
            },
            "stats": {
                "added": added,
                "removed": removed,
                "modified": modified
            },
            "diff_raw": diff_output,
            "before_content": before_content,
            "after_content": after_content
        }

    except Exception as e:
        return {
            "commit": {"message": "Unknown", "author": "Unknown", "timestamp": "Unknown"},
            "stats": {"added": 0, "removed": 0, "modified": 0},
            "diff_raw": f"Error pulling git diff: {e}",
            "before_content": "",
            "after_content": ""
        }
