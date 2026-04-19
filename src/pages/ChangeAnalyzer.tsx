import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/states/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Info, GitCommit, User, Clock, Plus, Minus, Pencil, GitCompareArrows, Loader2, AlertCircle, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { getChanges, ChangeAnalysis } from "@/lib/api";

import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';
import { createTwoFilesPatch } from 'diff';

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

  const added = mode === "auto" ? (data?.stats.added.toString() || "—") : "—";
  const removed = mode === "auto" ? (data?.stats.removed.toString() || "—") : "—";
  const modified = mode === "auto" ? (data?.stats.modified.toString() || "—") : "—";

  // Generate Git compatible diff patch from manual input
  let diffHtml = "";
  if (mode === "auto" && data?.diff_raw) {
    try {
      diffHtml = Diff2Html.html(data.diff_raw, {
        drawFileList: true,
        matching: 'lines',
        outputFormat: 'side-by-side'
      });
    } catch {
       diffHtml = "<p class='text-destructive'>Error parsing diff data.</p>";
    }
  } else if (mode === "manual" && (manualBefore || manualAfter)) {
    try {
      const patch = createTwoFilesPatch('Previous Code', 'Current Code', manualBefore, manualAfter);
      diffHtml = Diff2Html.html(patch, {
        drawFileList: false,
        matching: 'lines',
        outputFormat: 'side-by-side'
      });
    } catch {
       diffHtml = "<p class='text-destructive'>Error parsing manual diff data.</p>";
    }
  }

  return (
    <div className="space-y-6 pb-12">
      <SectionHeader
        title="Change Analyzer"
        description="Compare changes between commits with a GitHub-style side-by-side diff viewer."
      />

      {/* Mode Selector */}
      <div className="inline-flex w-full max-w-md rounded-xl border border-border bg-card p-1 shadow-sm">
        {([
          { id: "auto", label: "Auto Detect Repository Changes" },
          { id: "manual", label: "Manual Text Compare" },
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
        <div className="flex items-center gap-2 text-sm text-foreground font-medium p-4 border border-border bg-card rounded-lg shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Analyzing raw git history and parsing Unified Diff...
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
                <h3 className="text-sm font-semibold text-foreground">Latest Commit Information</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">HEAD</Badge>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  <GitCommit className="h-3.5 w-3.5" /> Commit Message
                </div>
                <p className="truncate text-sm font-medium text-foreground" title={data.commit.message}>
                  {data.commit.message || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  <User className="h-3.5 w-3.5" /> Author
                </div>
                <p className="truncate text-sm font-medium text-foreground" title={data.commit.author}>
                  {data.commit.author || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                  <Clock className="h-3.5 w-3.5" /> Timestamp
                </div>
                <p className="truncate text-sm font-medium text-foreground" title={data.commit.timestamp}>
                  {data.commit.timestamp || "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "manual" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileCode className="h-4 w-4"/> Previous Code</h3>
                <Badge variant="secondary" className="text-[10px]">before</Badge>
              </div>
              <Textarea
                value={manualBefore}
                onChange={(e) => setManualBefore(e.target.value)}
                placeholder="Paste the previous version of your code here..."
                className="min-h-[200px] resize-none font-mono text-xs leading-relaxed bg-muted/30 p-4"
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileCode className="h-4 w-4"/> Current Code</h3>
                <Badge variant="secondary" className="text-[10px]">after</Badge>
              </div>
              <Textarea
                value={manualAfter}
                onChange={(e) => setManualAfter(e.target.value)}
                placeholder="Paste the updated version of your code here..."
                className="min-h-[200px] resize-none font-mono text-xs leading-relaxed bg-muted/30 p-4"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {(mode === "manual" || (mode === "auto" && data)) && !loading && (
        <>
          {mode === "auto" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <SummaryCard label="Added Lines" icon={Plus} tone="success" symbol="+" value={added} />
              <SummaryCard label="Removed Lines" icon={Minus} tone="destructive" symbol="−" value={removed} />
              <SummaryCard label="Modified Lines" icon={Pencil} tone="warning" symbol="✏️" value={modified} />
            </div>
          )}

          {/* New GitHub Clone Diff Viewer */}
          <Card className="border-border/60 shadow-elegant overflow-hidden bg-background">
            <CardContent className="p-0">
              <div className="border-b border-border bg-muted/20 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                    <GitCompareArrows className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">GitHub Native Diff Viewer</h3>
                </div>
                <Badge variant="outline" className="text-[10px] border-primary/20 text-primary bg-primary/5">side-by-side</Badge>
              </div>
              
              <div className="p-1">
                {diffHtml ? (
                  /* diff2html renders its UI inherently mapped to full-width containers */
                  /* We apply global overrides nicely via CSS or inherent scopes */
                  <div 
                    className="w-full text-xs font-mono diff2html-wrapper"
                    dangerouslySetInnerHTML={{ __html: diffHtml }} 
                  />
                ) : (
                  <div className="p-12 text-center">
                    <EmptyState
                      icon={GitCompareArrows}
                      title="No Code Differences"
                      description={mode === "manual" ? "Paste code in both textareas above to render a diff." : "There are no detectable modifications in this commit."}
                      className="border-none bg-transparent"
                    />
                  </div>
                )}
              </div>
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
  success: "bg-success/10 text-success border-success/20",
  destructive: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-warning/15 text-warning border-warning/20",
};

const SummaryCard = ({ label, symbol, icon: Icon, tone, value }: SummaryCardProps) => (
  <Card className={cn("border bg-card/60", toneStyles[tone])}>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{label}</p>
        <div className="opacity-90">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-sm font-medium opacity-70">{symbol}</span>
      </div>
    </CardContent>
  </Card>
);

export default ChangeAnalyzer;
