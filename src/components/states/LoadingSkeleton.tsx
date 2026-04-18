import { cn } from "@/lib/utils";

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton = ({ className, lines = 3 }: LoadingSkeletonProps) => {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 w-full rounded-md bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:1000px_100%] animate-shimmer"
          style={{ width: `${90 - i * 12}%` }}
        />
      ))}
    </div>
  );
};

export const SkeletonCard = () => (
  <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
    <div className="h-4 w-1/3 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:1000px_100%] animate-shimmer" />
    <div className="mt-4 space-y-2.5">
      <div className="h-3 w-full rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:1000px_100%] animate-shimmer" />
      <div className="h-3 w-5/6 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:1000px_100%] animate-shimmer" />
      <div className="h-3 w-4/6 rounded bg-gradient-to-r from-muted via-muted/60 to-muted bg-[length:1000px_100%] animate-shimmer" />
    </div>
  </div>
);
