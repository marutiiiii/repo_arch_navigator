import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/states/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Info, GitCommit, User, Clock, Plus, Minus, Pencil, GitCompareArrows, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { getChanges, ChangeAnalysis } from "@/lib/api";

type Mode = "auto" | "manual";

const ChangeAnalyzer = () => {
  const { result } = useRepoAnalysis();
  const [mode, setMode] = useState<Mode>("auto");
  const [data, setData] = useState<ChangeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [manualBefore, setManualBefore] = useState("");
  const [manualAfter, setManualAfter] = useState("");

  useEffect(() => {
    if (mode === "manual" || !result?.repo_url) return;
    
    let mounted = true;
    const fetchChanges = async () => {
      setLoading(true);
      setError(null);
      try {
        const changes = await getChanges(result.repo_url);
        if (mounted) setData(changes);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load git changes.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchChanges();

    return () => { mounted = false; };
  }, [mode, result?.repo_url]);

  const displayBefore = mode === "auto" ? (data?.before_content || "") : manualBefore;
  const displayAfter = mode === "auto" ? (data?.after_content || "") : manualAfter;

  const added = mode === "auto" ? (data?.stats.added.toString() || "—") : "—";
  const removed = mode === "auto" ? (data?.stats.removed.toString() || "—") : "—";
  const modified = mode === "auto" ? (data?.stats.modified.toString() || "—") : "—";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Change Analyzer"
        description="Compare changes between commits or paste code manually to inspect a diff."
      />

      {/* Mode Selector */}
      <div className="inline-flex w-full max-w-md rounded-xl border border-border bg-card p-1 shadow-sm">
        {([
          { id: "auto", label: "Auto Detect Changes" },
          { id: "manual", label: "Manual Compare" },
        ] as const).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-smooth",
              mode === m.id
                ? "bg-gradient-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {!result && mode === "auto" && (
        <EmptyState
          icon={GitCommit}
          title="No Repository Selected"
          description="Analyze a repository on the Dashboard first to view automated commit changes."
        />
      )}

      {loading && mode === "auto" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing git history...
        </div>
      )}

      {error && mode === "auto" && (
         <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-2">
           <AlertCircle className="h-4 w-4" />
           {error}
         </div>
      )}

      {/* Auto-mode commit info card */}
      {mode === "auto" && data && !loading && (
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <GitCommit className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Commit Information</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">latest vs previous</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <GitCommit className="h-3 w-3" /> Commit Message
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground" title={data.commit.message}>
                  {data.commit.message || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <User className="h-3 w-3" /> Author
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground" title={data.commit.author}>
                  {data.commit.author || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Timestamp
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground" title={data.commit.timestamp}>
                  {data.commit.timestamp || "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-foreground/80">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              Changes are based on diff between HEAD~1 and HEAD. Content shown below is for the primary changed file.
            </div>
          </CardContent>
        </Card>
      )}

      {(mode === "manual" || (mode === "auto" && result)) && (
        <>
          {/* Code comparison */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {mode === "auto" ? "Previous Code (HEAD~1)" : "Paste Previous Code"}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">before</Badge>
                </div>
                <Textarea
                  readOnly={mode === "auto"}
                  value={displayBefore}
                  onChange={(e) => setManualBefore(e.target.value)}
                  placeholder={mode === "auto" ? "Previous commit content will appear here..." : "Paste the previous version of your code here..."}
                  className="min-h-[280px] resize-none font-mono text-xs leading-relaxed bg-muted/30"
                />
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    {mode === "auto" ? "Current Code (HEAD)" : "Paste Current Code"}
                  </h3>
                  <Badge variant="secondary" className="text-[10px]">after</Badge>
                </div>
                <Textarea
                  readOnly={mode === "auto"}
                  value={displayAfter}
                  onChange={(e) => setManualAfter(e.target.value)}
                  placeholder={mode === "auto" ? "Latest commit content will appear here..." : "Paste the updated version of your code here..."}
                  className="min-h-[280px] resize-none font-mono text-xs leading-relaxed bg-muted/30"
                />
              </CardContent>
            </Card>
          </div>

          {/* Changes summary */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="Added Lines" icon={Plus} tone="success" symbol="+" value={added} />
            <SummaryCard label="Removed Lines" icon={Minus} tone="destructive" symbol="−" value={removed} />
            <SummaryCard label="Modified Lines" icon={Pencil} tone="warning" symbol="✏️" value={modified} />
          </div>

          {/* Diff viewer */}
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <GitCompareArrows className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Diff Output</h3>
                </div>
                <Badge variant="secondary" className="text-[10px]">raw</Badge>
              </div>
              
              {mode === "auto" && data?.diff_raw ? (
                 <pre className="overflow-x-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
                   {data.diff_raw}
                 </pre>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
                  <EmptyState
                    icon={GitCompareArrows}
                    title="Code differences will appear here"
                    description={mode === "manual" ? "Manual diff visualization is not supported yet." : "Once both sides have content, a line-by-line diff will render in this panel."}
                    className="border-none bg-transparent"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  symbol: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "warning";
  value: string;
}

const toneStyles: Record<SummaryCardProps["tone"], string> = {
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
};

const SummaryCard = ({ label, symbol, icon: Icon, tone, value }: SummaryCardProps) => (
  <Card className="border-border/60">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{symbol}</span>
      </div>
    </CardContent>
  </Card>
);

export default ChangeAnalyzer;
