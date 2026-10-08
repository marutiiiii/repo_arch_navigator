import os
import tempfile
from git import Repo

def clone_repository(repo_url):
    """
    Stateless cloning: Clones the repo into a temporary directory 
    with a depth of 2 (to allow for git diff HEAD~1).
    Returns the TemporaryDirectory object (so it can be cleaned up later)
    and the path to the cloned code.
    """
    temp_dir = tempfile.TemporaryDirectory()
    clone_path = temp_dir.name
    
    try:
        # depth=2 is required so we have a previous commit to diff against
        Repo.clone_from(repo_url, clone_path, depth=2)
    except Exception as e:
        print("Error cloning repo:", e)
        temp_dir.cleanup()
        return None, None
            
    return temp_dir, clone_path