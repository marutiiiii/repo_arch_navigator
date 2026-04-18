import { useState } from "react";
import { ArrowRight, Github, Sparkles, GitBranch, Layers, ShieldCheck, RefreshCw } from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton, SkeletonCard } from "@/components/states/LoadingSkeleton";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";

type DemoState = "empty" | "loading" | "error";

const stateOptions: { id: DemoState; label: string }[] = [
  { id: "empty", label: "Empty" },
  { id: "loading", label: "Loading" },
  { id: "error", label: "Error" },
];

const stats = [
  { label: "Repositories", icon: Github },
  { label: "Dependencies", icon: Layers },
  { label: "Compatibility", icon: ShieldCheck },
  { label: "Recent Changes", icon: GitBranch },
];

const Dashboard = () => {
  const [demoState, setDemoState] = useState<DemoState>("empty");
  const [url, setUrl] = useState("");

  return (
    <div className="space-y-8">
      <SectionHeader
        title="Welcome back 👋"
        description="Analyze any repository's architecture, dependencies, and compatibility in seconds."
        actions={
          <div className="inline-flex rounded-lg border border-border bg-card p-1">
            {stateOptions.map((s) => (
              <button
                key={s.id}
                onClick={() => setDemoState(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                  demoState === s.id
                    ? "bg-gradient-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Hero / analyze card */}
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
                Paste a public GitHub URL — we'll map files, dependencies, and compatibility issues into a visual graph.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Github className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="h-11 pl-10 bg-card"
                  />
                </div>
                <Button size="lg" className="h-11 bg-gradient-primary hover:opacity-90 shadow-glow">
                  Analyze Repository
                  <ArrowRight className="ml-1.5 h-4 w-4" />
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
        {stats.map((s) =>
          demoState === "loading" ? (
            <SkeletonCard key={s.label} />
          ) : (
            <Card key={s.label} className="border-border/60">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="mt-3 text-2xl font-bold text-foreground">—</p>
                <p className="mt-1 text-xs text-muted-foreground">No data yet</p>
              </CardContent>
            </Card>
          ),
        )}
      </div>

      {/* Activity area showing the selected state */}
      <Card className="border-border/60">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">Recent Analyses</h3>
              <p className="text-xs text-muted-foreground">A history of repositories you've analyzed will appear here.</p>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>

          {demoState === "loading" && <LoadingSkeleton lines={5} />}
          {demoState === "error" && <ErrorState description="Unable to load recent analyses. Check your connection and try again." />}
          {demoState === "empty" && (
            <EmptyState
              icon={Github}
              title="No analyses yet"
              description="Once you analyze a repository, its summary will appear here for quick access."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
