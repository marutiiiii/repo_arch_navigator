import { createContext, useContext, useState, ReactNode } from "react";
import type { AnalysisResult } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  referenced_files?: string[];
  timestamp: number;
}

interface RepoAnalysisContextValue {
  result: AnalysisResult | null;
  setResult: (r: AnalysisResult | null) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
  error: string | null;
  setError: (e: string | null) => void;
  chatHistory: ChatMessage[];
  setChatHistory: (h: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
}

const RepoAnalysisContext = createContext<RepoAnalysisContextValue | null>(null);

export function RepoAnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  return (
    <RepoAnalysisContext.Provider
      value={{ result, setResult, isLoading, setIsLoading, error, setError, chatHistory, setChatHistory }}
    >
      {children}
    </RepoAnalysisContext.Provider>
  );
}

export function useRepoAnalysis() {
  const ctx = useContext(RepoAnalysisContext);
  if (!ctx) throw new Error("useRepoAnalysis must be used inside RepoAnalysisProvider");
  return ctx;
}
