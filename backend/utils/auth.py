import os
import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8080")
API_URL = os.getenv("API_URL", "http://127.0.0.1:5000")

# In-memory session store for local dev
current_user = {
    "logged_in": False,
    "provider": None,
    "profile": None,
    "access_token": None,
    "repos": []
}

def get_github_login_url():
    return f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=user,repo&prompt=consent"

def handle_github_callback(code):
    # Exchange code for token
    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
        },
        headers={"Accept": "application/json"}
    )
    token_json = token_response.json()
    access_token = token_json.get("access_token")

    if not access_token:
        return False

    # Fetch user profile
    user_resp = requests.get(
        "https://api.github.com/user",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    # Fetch user repos
    repo_resp = requests.get(
        "https://api.github.com/user/repos?sort=updated&per_page=100",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    repos_list = []
    if isinstance(repo_resp, list):
        for r in repo_resp:
            repos_list.append({
                "name": r.get("name"),
                "full_name": r.get("full_name"),
                "html_url": r.get("html_url"),
                "description": r.get("description"),
                "updated_at": r.get("updated_at"),
                "language": r.get("language")
            })

    # Update global session
    current_user["logged_in"] = True
    current_user["provider"] = "github"
    current_user["profile"] = {
        "name": user_resp.get("name", user_resp.get("login")),
        "avatar_url": user_resp.get("avatar_url"),
        "username": user_resp.get("login")
    }
    current_user["access_token"] = access_token
    current_user["repos"] = repos_list

    return True

def get_google_login_url():
    redirect_uri = f"{API_URL}/auth/google/callback"
    return f"https://accounts.google.com/o/oauth2/v2/auth?client_id={GOOGLE_CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code&scope=email profile&prompt=select_account"

def handle_google_callback(code):
    redirect_uri = f"{API_URL}/auth/google/callback"
    token_response = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
    )
    token_json = token_response.json()
    access_token = token_json.get("access_token")

    if not access_token:
        return False

    # Fetch user profile
    user_resp = requests.get(
        "https://www.googleapis.com/oauth2/v1/userinfo",
        headers={"Authorization": f"Bearer {access_token}"}
    ).json()

    # Google doesn't have repos, so we just set an empty list or mock
    current_user["logged_in"] = True
    current_user["provider"] = "google"
    current_user["profile"] = {
        "name": user_resp.get("name"),
        "avatar_url": user_resp.get("picture"),
        "username": user_resp.get("email")
    }
    current_user["access_token"] = access_token
    current_user["repos"] = [] # No GitHub repos via Google OAuth

    return True

def get_current_user():
    return current_user
