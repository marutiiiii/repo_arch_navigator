import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { CompatibilityScore } from "@/components/compatibility/CompatibilityScore";
import { AlertCircle, Cpu, FileMinus, Lightbulb, Terminal, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { getCompatibility, CompatibilityReport } from "@/lib/api";

const REQUIREMENTS_KEYS = ["Operating System", "Package Manager", "Runtime", "Language"];

const Compatibility = () => {
  const { result } = useRepoAnalysis();
  const [report, setReport] = useState<CompatibilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result?.repo_url) return;
    let mounted = true;
    const fetchCompat = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompatibility(result.repo_url);
        if (mounted) setReport(data);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load compatibility report.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCompat();
    return () => { mounted = false; };
  }, [result?.repo_url]);

  // Derive unused files from global result
  const unusedFiles = result?.analysis.filter((f) => f.is_dead) || [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compatibility Report"
        description="Verify environment versions, find blockers, and get setup suggestions."
      />

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Analyzing compatibility...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!result && !loading && !error && (
        <EmptyState
          icon={Cpu}
          title="No Repository Selected"
          description="Analyze a repository on the Dashboard first to see compatibility details."
        />
      )}

      {result && report && (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 1. Required environments */}
            <Card className="lg:col-span-2 border-border/60">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Required Environment Versions</h3>
                    <p className="text-xs text-muted-foreground">Detected from project manifests.</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {REQUIREMENTS_KEYS.map((r) => (
                    <div key={r} className="rounded-lg border border-border bg-muted/30 p-3 flex flex-col justify-between">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r}</p>
                      <p className="mt-1.5 text-sm font-semibold text-foreground break-words">
                        {report.requirements[r] || "Unknown"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 5. Compatibility score */}
            <Card className="border-border/60">
              <CardContent className="flex flex-col items-center justify-center p-5">
                <h3 className="self-start text-sm font-semibold text-foreground">Compatibility Score</h3>
                <div className="mt-4">
                  <CompatibilityScore value={Math.max(0, 100 - report.issues.length * 20)} />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* 2. Issues */}
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Issues</h3>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{report.issues.length} detected</Badge>
                </div>
                {report.issues.length === 0 ? (
                  <EmptyState
                    icon={AlertCircle}
                    title="No issues detected"
                    description="Version mismatches, missing dependencies, and OS conflicts will be listed here."
                    className="border-none bg-transparent shadow-none"
                  />
                ) : (
                  <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                    {report.issues.map((iss, i) => <li key={i}>{iss}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 3. Suggestions */}
            <Card className="border-border/60">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <Lightbulb className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">Setup Suggestions</h3>
                </div>
                {report.suggestions.length === 0 ? (
                  <EmptyState
                    icon={Lightbulb}
                    title="No suggestions"
                    description="Recommended actions to make your environment compatible will be displayed here."
                    className="border-none bg-transparent shadow-none"
                  />
                ) : (
                  <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                    {report.suggestions.map((sug, i) => <li key={i}>{sug}</li>)}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 4. Command box */}
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Terminal className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Recommended Commands</h3>
              </div>
              <pre className="overflow-x-auto rounded-lg border border-border bg-foreground/[0.03] p-4 font-mono text-xs leading-relaxed text-muted-foreground">
{report.commands || `# Setup commands will appear here once compatibility analysis is complete\n$ —`}
              </pre>
            </CardContent>
          </Card>

          {/* 6. Unused files */}
          <Card className="border-border/60">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileMinus className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Unused / Inactive Files</h3>
                    <p className="text-xs text-muted-foreground">Files with no incoming references in the project graph.</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px]">{unusedFiles.length} files</Badge>
              </div>
              
              {unusedFiles.length === 0 ? (
                <EmptyState
                  icon={FileMinus}
                  title="No unused files detected"
                  description="Files that are not imported anywhere will be surfaced here for safe removal."
                  className="border-none bg-transparent shadow-none"
                />
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {unusedFiles.map(f => (
                    <div key={f.file} className="text-xs font-mono text-muted-foreground p-1.5 rounded hover:bg-muted/50 cursor-default">
                      {f.file}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default Compatibility;
