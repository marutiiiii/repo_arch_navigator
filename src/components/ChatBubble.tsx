import { useNavigate } from "react-router-dom";
import { MessageSquareCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";

export const ChatBubble = () => {
  const { result } = useRepoAnalysis();
  const navigate = useNavigate();

  // Only show once a repo is analyzed, and not on the ask page itself
  if (!result || window.location.pathname === "/ask") return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button
        onClick={() => navigate("/ask")}
        className="h-14 w-14 rounded-full shadow-glow bg-gradient-primary hover:opacity-90 flex flex-col items-center justify-center gap-0.5 group"
        title="Ask the Code — Powered by Ollama"
      >
        <MessageSquareCode className="h-6 w-6" />
      </Button>
      {/* Tooltip label */}
      <div className="absolute bottom-16 right-0 whitespace-nowrap rounded-lg border border-border bg-card/90 backdrop-blur px-3 py-1.5 text-xs font-medium text-foreground opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-sm">
        Ask the Code
      </div>
    </div>
  );
};
