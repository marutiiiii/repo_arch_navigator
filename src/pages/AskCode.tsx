import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, User, Send, Loader2, Sparkles, FileCode,
  ChevronDown, ChevronUp, Trash2, ArrowLeft,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { askCode } from "@/lib/api";
import type { ChatMessage } from "@/context/RepoAnalysisContext";
import { cn } from "@/lib/utils";

// ── Suggested questions generated from the repo structure ──────────────────
function buildSuggestions(
  entryPoint: string | null,
  totalFiles: number,
  highFiles: { file: string }[]
): string[] {
  const chips: string[] = [
    "How is this project structured overall?",
    "What does the entry point do?",
    "Which are the most important files and why?",
    "Are there any dead code files I should remove?",
    "How are dependencies between modules organized?",
  ];

  if (entryPoint) {
    chips[1] = `What does ${entryPoint} do and what does it handle?`;
  }
  if (highFiles.length > 0) {
    chips[2] = `Explain the role of ${highFiles[0].file.split("/").pop()}`;
  }
  return chips;
}

// ── Markdown-like code block renderer (no extra deps) ──────────────────────
function MessageContent({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          const lang = lines[0].replace("```", "").trim();
          const code = lines.slice(1, -1).join("\n");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg border border-border bg-foreground/[0.04] p-3 font-mono text-xs text-foreground"
            >
              {lang && (
                <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">
                  {lang}
                </span>
              )}
              {code}
            </pre>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {part}
          </p>
        );
      })}
    </div>
  );
}

// ── Referenced files collapsible ───────────────────────────────────────────
function ReferencedFiles({ files }: { files: string[] }) {
  const [open, setOpen] = useState(false);
  if (!files || files.length === 0) return null;
  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-muted/30">
      <button
        className="flex w-full items-center justify-between px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5">
          <FileCode className="h-3 w-3" />
          {files.length} file{files.length !== 1 ? "s" : ""} referenced
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="border-t border-border/50 px-3 py-2 space-y-1">
          {files.map((f) => (
            <div key={f} className="font-mono text-[10px] text-primary">
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
const AskCode = () => {
  const navigate = useNavigate();
  const { result, chatHistory, setChatHistory } = useRepoAnalysis();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = result
    ? buildSuggestions(
        result.entry_point,
        result.total_files,
        result.analysis.filter((f) => f.tag === "HIGH")
      )
    : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, loading]);

  const sendMessage = async (text?: string) => {
    const question = (text ?? input).trim();
    if (!question || !result) return;
    setInput("");

    const userMsg: ChatMessage = {
      role: "user",
      content: question,
      timestamp: Date.now(),
    };
    setChatHistory((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await askCode(result.repo_url, question);
      const aiMsg: ChatMessage = {
        role: "ai",
        content: response.answer,
        referenced_files: response.referenced_files,
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, aiMsg]);
    } catch (e: unknown) {
      const errMsg: ChatMessage = {
        role: "ai",
        content: e instanceof Error ? e.message : "Error communicating with Ollama.",
        timestamp: Date.now(),
      };
      setChatHistory((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  if (!result) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Ask the Code" description="Natural language queries about your repository." />
        <Card className="border-border/60">
          <CardContent className="p-8">
            <EmptyState
              icon={Bot}
              title="No repository analyzed yet"
              description="Go to the Dashboard, analyze a repository, then come back here to ask questions about it."
            />
            <div className="mt-6 flex justify-center">
              <Button onClick={() => navigate("/")} className="bg-gradient-primary hover:opacity-90">
                <ArrowLeft className="mr-2 h-4 w-4" /> Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 h-[calc(100vh-7rem)]">
      <SectionHeader
        title="Ask the Code"
        description={`Powered by Ollama llama3 · ${result.repo_url.split("/").slice(-2).join("/")}`}
        actions={
          <>
            <Badge variant="secondary" className="text-[10px]">
              {result.total_files} files indexed
            </Badge>
            {chatHistory.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatHistory([])}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Clear Chat
              </Button>
            )}
          </>
        }
      />

      {/* Chat area */}
      <Card className="flex flex-col flex-1 overflow-hidden border-border/60 min-h-0">
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
          {chatHistory.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
              {/* Welcome hero */}
              <div className="flex flex-col items-center text-center max-w-md gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Ask anything about the codebase</h3>
                <p className="text-sm text-muted-foreground">
                  I read the actual source files and answer based on real code — not guesses.
                </p>
              </div>

              {/* Suggested questions */}
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all duration-150"
                  >
                    <Sparkles className="h-3 w-3 text-primary shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm mt-0.5",
                  msg.role === "ai"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.role === "ai" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
              </div>

              {/* Bubble */}
              <div className={cn("max-w-[75%]", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted text-foreground rounded-tl-sm border border-border/50"
                  )}
                >
                  {msg.role === "ai" ? (
                    <MessageContent content={msg.content} />
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === "ai" && msg.referenced_files && (
                  <ReferencedFiles files={msg.referenced_files} />
                )}
                <p className="mt-1 text-[10px] text-muted-foreground px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-border/50 bg-muted px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading the code and thinking…
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="border-t border-border/60 bg-card/50 p-4">
          {/* Inline suggestions when chat has started */}
          {chatHistory.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {suggestions.slice(0, 3).map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                >
                  {s.length > 40 ? s.slice(0, 38) + "…" : s}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3 items-end">
            <Textarea
              ref={textareaRef}
              id="ask-code-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask anything about this codebase… (Enter to send, Shift+Enter for newline)"
              className="min-h-[56px] max-h-[140px] resize-none bg-card text-sm"
              rows={2}
              disabled={loading}
            />
            <Button
              id="ask-send-btn"
              size="icon"
              className="h-14 w-14 shrink-0 rounded-xl bg-gradient-primary hover:opacity-90 shadow-glow"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AskCode;
