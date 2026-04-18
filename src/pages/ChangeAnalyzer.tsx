import { useState } from "react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/states/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Info, GitCommit, User, Clock, Plus, Minus, Pencil, GitCompareArrows } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "auto" | "manual";

const ChangeAnalyzer = () => {
  const [mode, setMode] = useState<Mode>("auto");

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

      {/* Auto-mode commit info card */}
      {mode === "auto" && (
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <GitCommit className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Commit Information</h3>
              </div>
              <Badge variant="secondary" className="text-[10px]">latest</Badge>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <GitCommit className="h-3 w-3" /> Commit Message
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">—</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <User className="h-3 w-3" /> Author
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">—</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="h-3 w-3" /> Timestamp
                </div>
                <p className="mt-1.5 truncate text-sm font-medium text-foreground">—</p>
              </div>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-info/20 bg-info/5 p-3 text-xs text-foreground/80">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              Changes are based on latest commit differences.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Code comparison */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {mode === "auto" ? "Previous Code (Previous Commit)" : "Paste Previous Code"}
              </h3>
              <Badge variant="secondary" className="text-[10px]">before</Badge>
            </div>
            <Textarea
              readOnly={mode === "auto"}
              placeholder={mode === "auto" ? "Previous commit content will appear here..." : "Paste the previous version of your code here..."}
              className="min-h-[280px] resize-none font-mono text-xs leading-relaxed bg-muted/30"
            />
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {mode === "auto" ? "Current Code (Latest Commit)" : "Paste Current Code"}
              </h3>
              <Badge variant="secondary" className="text-[10px]">after</Badge>
            </div>
            <Textarea
              readOnly={mode === "auto"}
              placeholder={mode === "auto" ? "Latest commit content will appear here..." : "Paste the updated version of your code here..."}
              className="min-h-[280px] resize-none font-mono text-xs leading-relaxed bg-muted/30"
            />
          </CardContent>
        </Card>
      </div>

      {/* Changes summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Added Lines" icon={Plus} tone="success" symbol="+" />
        <SummaryCard label="Removed Lines" icon={Minus} tone="destructive" symbol="−" />
        <SummaryCard label="Modified Lines" icon={Pencil} tone="warning" symbol="✏️" />
      </div>

      {/* Diff viewer */}
      <Card className="border-border/60">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <GitCompareArrows className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Diff Viewer</h3>
            </div>
            <Badge variant="secondary" className="text-[10px]">visualization</Badge>
          </div>
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
            <EmptyState
              icon={GitCompareArrows}
              title="Code differences will appear here"
              description="Once both sides have content, a colorized line-by-line diff will render in this panel."
              className="border-none bg-transparent"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface SummaryCardProps {
  label: string;
  symbol: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "destructive" | "warning";
}

const toneStyles: Record<SummaryCardProps["tone"], string> = {
  success: "bg-success/10 text-success",
  destructive: "bg-destructive/10 text-destructive",
  warning: "bg-warning/15 text-warning",
};

const SummaryCard = ({ label, symbol, icon: Icon, tone }: SummaryCardProps) => (
  <Card className="border-border/60">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneStyles[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">—</span>
        <span className="text-sm text-muted-foreground">{symbol}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">No diff computed yet</p>
    </CardContent>
  </Card>
);

export default ChangeAnalyzer;
