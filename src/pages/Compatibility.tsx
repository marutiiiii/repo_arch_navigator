import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states/EmptyState";
import { CompatibilityScore } from "@/components/compatibility/CompatibilityScore";
import { AlertCircle, Cpu, FileMinus, Lightbulb, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const requirements = ["Node.js", "Package Manager", "Operating System", "Runtime"];

const Compatibility = () => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Compatibility Report"
        description="Verify environment versions, find blockers, and get setup suggestions."
      />

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
              {requirements.map((r) => (
                <div key={r} className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{r}</p>
                  <p className="mt-1.5 text-sm font-semibold text-foreground">—</p>
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
              <CompatibilityScore />
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
              <Badge variant="secondary" className="text-[10px]">version mismatch · missing deps · OS</Badge>
            </div>
            <EmptyState
              icon={AlertCircle}
              title="No issues detected"
              description="Version mismatches, missing dependencies, and OS conflicts will be listed here."
            />
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
            <EmptyState
              icon={Lightbulb}
              title="Setup suggestions will appear here"
              description="Recommended actions to make your environment compatible will be displayed once analysis runs."
            />
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
{`# Setup commands will appear here once compatibility analysis is complete
$ —`}
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
            <Badge variant="secondary" className="text-[10px]">cleanup</Badge>
          </div>
          <EmptyState
            icon={FileMinus}
            title="No unused files detected"
            description="Files that are not imported anywhere will be surfaced here for safe removal."
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Compatibility;
