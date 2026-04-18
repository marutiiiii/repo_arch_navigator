import { Network } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";

export const GraphViewer = () => {
  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-gradient-card">
      {/* decorative grid */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl" />

      <div className="relative flex h-full min-h-[420px] items-center justify-center p-6">
        <EmptyState
          icon={Network}
          title="Dependency graph will appear here"
          description="Once a repository is analyzed, modules and their relationships will render as an interactive graph."
          className="max-w-md border-none bg-card/60 backdrop-blur"
        />
      </div>
    </div>
  );
};
