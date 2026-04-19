import os
from git import Repo

def clone_repository(repo_url):
    # Create a base folder for repos
    base_dir = "repos"
    
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
    
    # Extract repo name
    repo_name = repo_url.split("/")[-1].replace(".git", "")
    
    clone_path = os.path.join(base_dir, repo_name)
    
    # Clone only if not already present
    if not os.path.exists(clone_path):
        try:
            print("Cloning repository...")
            Repo.clone_from(repo_url, clone_path)
            print("Cloned successfully!")
        except Exception as e:
            print("Error cloning repo:", e)
            return None
    else:
        print("Repo already exists. Pulling latest changes...")
        try:
            repo = Repo(clone_path)
            repo.remotes.origin.pull()
            print("Pulled latest changes successfully!")
        except Exception as e:
            print("Error pulling latest changes:", e)
            # We don't return None here so analysis can still proceed with older code if offline
            
    return clone_path