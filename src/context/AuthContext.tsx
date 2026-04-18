import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const BASE_URL = "http://127.0.0.1:5000";

export interface Repo {
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  updated_at: string;
  language: string;
}

export interface UserProfile {
  name: string;
  username: string;
  avatar_url: string;
}

export interface AuthState {
  logged_in: boolean;
  provider: "github" | "google" | null;
  profile: UserProfile | null;
  repos: Repo[];
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    logged_in: false,
    provider: null,
    profile: null,
    repos: [],
    loading: true,
  });

  const checkAuth = async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`);
      if (res.ok) {
        const data = await res.json();
        setAuthState({
          logged_in: data.logged_in,
          provider: data.provider,
          profile: data.profile,
          repos: data.repos || [],
          loading: false,
        });
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch {
      setAuthState(prev => ({ ...prev, loading: false }));
    }
  };

  const logout = async () => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, { method: "POST" });
      setAuthState({
        logged_in: false,
        provider: null,
        profile: null,
        repos: [],
        loading: false,
      });
      window.location.href = "/login";
    } catch {}
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ ...authState, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
