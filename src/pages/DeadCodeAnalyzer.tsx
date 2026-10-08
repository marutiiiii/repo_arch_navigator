import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileX2,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronRight,
  Zap,
  BarChart3,
  Lock,
  Package,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getDeadCode, getFileContent, DeadCodeReport, DeadSnippet, DeadFile } from "@/lib/api";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─────────────────────────────────────────────────────────────
// Confidence badge
// ─────────────────────────────────────────────────────────────
function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 85
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : value >= 60
      ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
      : "bg-blue-500/15 text-blue-400 border-blue-500/30";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}>
      {value}% confident
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Kind badge
// ─────────────────────────────────────────────────────────────
function KindBadge({ kind, isPrivate }: { kind: string; isPrivate: boolean }) {
  const map: Record<string, string> = {
    function: "bg-violet-500/15 text-violet-400 border-violet-500/30",
    class: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    export: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };
  const cls = map[kind] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {isPrivate && <Lock className="h-2.5 w-2.5" />}
      {kind}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Inline code viewer — renders lines with optional highlight range
// ─────────────────────────────────────────────────────────────
interface CodeViewerProps {
  content: string;
  /** Lines to highlight (1-indexed, inclusive). Undefined = highlight all. */
  highlightStart?: number;
  highlightEnd?: number;
  highlightColor?: "red" | "amber";
  /** Only show lines from start-5 to end+5 instead of the full file */
  focusRange?: boolean;
}

function CodeViewer({
  content,
  highlightStart,
  highlightEnd,
  highlightColor = "red",
  focusRange = false,
}: CodeViewerProps) {
  const lines = content.split("\n");
  const total = lines.length;

  let startIdx = 0;
  let endIdx = total - 1;

  if (focusRange && highlightStart !== undefined && highlightEnd !== undefined) {
    startIdx = Math.max(0, highlightStart - 1 - 5);
    endIdx   = Math.min(total - 1, highlightEnd - 1 + 5);
  }

  const visibleLines = lines.slice(startIdx, endIdx + 1);
  const highlightBg =
    highlightColor === "amber"
      ? "bg-amber-500/20 border-l-2 border-amber-400"
      : "bg-red-500/15 border-l-2 border-red-400";

  return (
    <div className="mt-2 rounded-md border border-border/60 overflow-hidden text-[11px] font-mono">
      <div className="bg-card/80 px-3 py-1.5 border-b border-border/60 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {focusRange && highlightStart !== undefined
            ? `Lines ${highlightStart}–${highlightEnd} · ${highlightEnd! - highlightStart! + 1} dead lines`
            : `${total} lines total — entire file is unreachable`}
        </span>
        {startIdx > 0 && (
          <span className="text-[10px] text-muted-foreground italic">… {startIdx} lines above …</span>
        )}
      </div>
      <ScrollArea className="max-h-64">
        <div className="bg-[#0d1117]">
          {visibleLines.map((line, i) => {
            const lineNo = startIdx + i + 1; // 1-indexed
            const isHighlighted =
              highlightStart !== undefined && highlightEnd !== undefined
                ? lineNo >= highlightStart && lineNo <= highlightEnd
                : true; // dead file → highlight all

            return (
              <div
                key={lineNo}
                className={`flex items-stretch ${isHighlighted ? highlightBg : ""}`}
              >
                <span className="select-none w-10 shrink-0 text-right pr-3 py-0.5 text-muted-foreground/50 border-r border-border/30 bg-black/20">
                  {lineNo}
                </span>
                <pre className="px-3 py-0.5 text-foreground/85 whitespace-pre-wrap break-all min-w-0">
                  {line || " "}
                </pre>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dead file row — click to load and show the entire file content
// ─────────────────────────────────────────────────────────────
function DeadFileRow({ item, repoUrl }: { item: DeadFile; repoUrl: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && content === null && !loadingContent) {
      setLoadingContent(true);
      setContentError(null);
      try {
        const text = await getFileContent(repoUrl, item.file);
        setContent(text);
      } catch (e: unknown) {
        setContentError(e instanceof Error ? e.message : "Failed to load file");
      } finally {
        setLoadingContent(false);
      }
    }
  }, [open, content, loadingContent, repoUrl, item.file]);

  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-red-500/10 transition-colors text-left"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <FileX2 className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <code className="text-xs text-foreground truncate font-mono">{item.file}</code>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] text-muted-foreground">{item.lines} lines</span>
          <ConfidenceBadge value={item.confidence} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-red-500/20 bg-black/10">
          {loadingContent && (
            <div className="flex items-center gap-2 pt-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading file…
            </div>
          )}
          {contentError && (
            <p className="pt-3 text-xs text-destructive">{contentError}</p>
          )}
          {content !== null && !loadingContent && (
            <CodeViewer
              content={content}
              highlightColor="red"
              focusRange={false}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Dead snippet row — click to load file and highlight the dead range
// ─────────────────────────────────────────────────────────────
function DeadSnippetRow({ item, repoUrl }: { item: DeadSnippet; repoUrl: string }) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);

  const handleToggle = useCallback(async () => {
    const next = !open;
    setOpen(next);
    if (next && content === null && !loadingContent) {
      setLoadingContent(true);
      setContentError(null);
      try {
        const text = await getFileContent(repoUrl, item.file);
        setContent(text);
      } catch (e: unknown) {
        setContentError(e instanceof Error ? e.message : "Failed to load file");
      } finally {
        setLoadingContent(false);
      }
    }
  }, [open, content, loadingContent, repoUrl, item.file]);

  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-amber-500/10 transition-colors text-left"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          {open
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          <Code2 className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span className="text-xs font-semibold text-foreground font-mono truncate">{item.name}</span>
          <KindBadge kind={item.kind} isPrivate={item.is_private} />
          <span className="text-[10px] text-muted-foreground truncate hidden sm:block">— {item.file}</span>
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          <span className="text-[10px] text-muted-foreground">{item.lines} lines</span>
          <ConfidenceBadge value={item.confidence} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-amber-500/20 bg-black/10">
          <p className="text-[10px] text-muted-foreground pt-2 font-mono">
            📄 {item.file} · L{item.lineno}–{item.end_lineno}
          </p>
          {loadingContent && (
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading snippet…
            </div>
          )}
          {contentError && (
            <p className="pt-2 text-xs text-destructive">{contentError}</p>
          )}
          {content !== null && !loadingContent && (
            <CodeViewer
              content={content}
              highlightStart={item.lineno}
              highlightEnd={item.end_lineno}
              highlightColor="amber"
              focusRange={true}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Summary stat card
// ─────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] font-medium uppercase tracking-wider opacity-70">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────
const DeadCodeAnalyzer = () => {
  const { result } = useRepoAnalysis();
  const navigate = useNavigate();
  const [report, setReport] = useState<DeadCodeReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "snippets">("files");

  const repoUrl = result?.repo_url ?? "";

  async function handleAnalyze() {
    if (!repoUrl) return;
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await getDeadCode(repoUrl);
      setReport(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <SectionHeader
        title="Dead Code Analyzer"
        description="Detect unreachable files and unused functions/classes. Click any row to preview the dead code inline."
      />

      {/* Repo selector */}
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardContent className="p-5">
          {!repoUrl ? (
            <div className="flex items-start gap-3 text-sm text-amber-400">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                No repository loaded. Please{" "}
                <button
                  className="underline underline-offset-2 hover:text-amber-300"
                  onClick={() => navigate("/")}
                >
                  analyze a repository first
                </button>{" "}
                from the Dashboard.
              </span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Input
                readOnly
                value={repoUrl}
                className="flex-1 bg-card/40 text-sm font-mono"
              />
              <Button
                className="bg-primary hover:bg-primary/90 min-w-[180px]"
                onClick={handleAnalyze}
                disabled={loading}
                id="run-dead-code-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning…
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Scan for Dead Code
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {report && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              icon={FileX2}
              label="Dead Files"
              value={report.summary.dead_files}
              color="border-red-500/30 bg-red-500/5 text-red-400"
            />
            <StatCard
              icon={Code2}
              label="Dead Snippets"
              value={report.summary.dead_snippets}
              color="border-amber-500/30 bg-amber-500/5 text-amber-400"
            />
            <StatCard
              icon={BarChart3}
              label="Lines Recoverable"
              value={report.summary.total_lines_recoverable.toLocaleString()}
              color="border-primary/30 bg-primary/5 text-primary"
            />
          </div>

          {report.summary.dead_files === 0 && report.summary.dead_snippets === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              No dead code detected in this repository. 🎉
            </div>
          )}

          {/* Tabs */}
          {(report.summary.dead_files > 0 || report.summary.dead_snippets > 0) && (
            <Card className="border-border/60">
              <CardHeader className="pb-0 pt-4 px-4">
                <div className="flex items-center gap-1 border-b border-border/60 pb-3">
                  <button
                    id="tab-dead-files"
                    onClick={() => setActiveTab("files")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "files"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileX2 className="h-3.5 w-3.5" />
                    Dead Files
                    <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1.5">
                      {report.summary.dead_files}
                    </Badge>
                  </button>
                  <button
                    id="tab-dead-snippets"
                    onClick={() => setActiveTab("snippets")}
                    className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === "snippets"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Code2 className="h-3.5 w-3.5" />
                    Unused Snippets
                    <Badge variant="secondary" className="ml-1 text-[9px] h-4 px-1.5">
                      {report.summary.dead_snippets}
                    </Badge>
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-4">
                {activeTab === "files" && (
                  <div className="space-y-2">
                    {report.dead_files.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No dead files detected.</p>
                    ) : (
                      <ScrollArea className="h-[520px] pr-2">
                        <div className="space-y-2">
                          {report.dead_files.map((item) => (
                            <DeadFileRow key={item.file} item={item} repoUrl={repoUrl} />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}

                {activeTab === "snippets" && (
                  <div className="space-y-2">
                    {report.dead_snippets.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">No unused snippets detected.</p>
                    ) : (
                      <ScrollArea className="h-[520px] pr-2">
                        <div className="space-y-2">
                          {report.dead_snippets.map((item, i) => (
                            <DeadSnippetRow
                              key={`${item.file}-${item.name}-${i}`}
                              item={item}
                              repoUrl={repoUrl}
                            />
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info notice */}
          <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-400">
            <Package className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              Dead file detection uses import-graph reachability. Snippet detection uses AST analysis (Python) and export scanning (JS/TS).
              Click any row to view the dead code inline. Dynamic imports may cause false positives.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeadCodeAnalyzer;
