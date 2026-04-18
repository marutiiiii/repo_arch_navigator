import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Github, Sparkles, GitBranch, Layers,
  ShieldCheck, AlertCircle, CheckCircle2, Loader2,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { analyzeRepo } from "@/lib/api";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { result, setResult, isLoading, setIsLoading, error, setError } = useRepoAnalysis();
  const [url, setUrl] = useState("");

  async function handleAnalyze() {
    if (!url.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      const data = await analyzeRepo(url.trim());
      setResult(data);
      navigate("/repository");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  const stats = [
    {
      label: "Repositories",
      icon: Github,
      value: result ? 1 : "—",
      sub: result ? result.repo_url.split("/").slice(-2).join("/") : "No data yet",
    },
    {
      label: "Total Files",
      icon: Layers,
      value: result ? result.total_files : "—",
      sub: result ? "source files detected" : "No data yet",
    },
    {
      label: "Dependencies",
      icon: ShieldCheck,
      value: result ? result.total_dependencies : "—",
      sub: result ? "import relationships" : "No data yet",
    },
    {
      label: "Entry Point",
      icon: GitBranch,
      value: result ? "✓" : "—",
      sub: result ? (result.entry_point ?? "unknown") : "No data yet",
    },
  ];

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Welcome back 👋"
        description="Analyze any repository's architecture, dependencies, and compatibility in seconds."
      />

      {/* Hero / Analyze Card */}
      <Card className="overflow-hidden border-border/60 shadow-elegant">
        <div className="relative bg-gradient-card p-6 sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-primary-glow/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Architecture Insights
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Enter a GitHub repository to begin
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Paste a public GitHub URL — we'll map files, dependencies, and architecture into a visual graph.
              </p>

              {/* Error banner */}
              {error && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Success banner */}
              {result && !isLoading && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Analysis complete — {result.total_files} files parsed.
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Github className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="repo-url-input"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="https://github.com/owner/repository"
                    className="h-11 pl-10 bg-card"
                    disabled={isLoading}
                  />
                </div>
                <Button
                  id="analyze-btn"
                  size="lg"
                  className="h-11 bg-gradient-primary hover:opacity-90 shadow-glow min-w-[160px]"
                  onClick={handleAnalyze}
                  disabled={isLoading || !url.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      Analyze Repository
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="hidden lg:flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-card/60 backdrop-blur border border-border">
              <Layers className="h-14 w-14 text-primary" strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-bold text-foreground">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground truncate">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent analyses */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Analysis Results</h3>
              <p className="text-xs text-muted-foreground">
                Top files by importance score will appear here after analysis.
              </p>
            </div>
            {result && (
              <Badge variant="secondary" className="text-xs">
                {result.analysis.filter((f) => f.tag === "HIGH").length} High-impact files
              </Badge>
            )}
          </div>

          {!result ? (
            <EmptyState
              icon={Github}
              title="No analyses yet"
              description="Once you analyze a repository, its summary will appear here for quick access."
            />
          ) : (
            <div className="space-y-2">
              {result.analysis
                .slice()
                .sort((a, b) => b.score - a.score)
                .slice(0, 8)
                .map((item) => (
                  <div
                    key={item.file}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-2.5 text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.is_entry && (
                        <Badge className="shrink-0 text-[10px] bg-primary/20 text-primary border-primary/30">
                          entry
                        </Badge>
                      )}
                      {item.is_dead && (
                        <Badge variant="outline" className="shrink-0 text-[10px]">dead</Badge>
                      )}
                      <span className="truncate text-muted-foreground font-mono text-xs">{item.file}</span>
                    </div>
                    <Badge
                      variant={item.tag === "HIGH" ? "default" : "secondary"}
                      className="ml-4 shrink-0 text-[10px]"
                    >
                      {item.tag} · {item.score}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
