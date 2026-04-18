import { Network } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { useMemo } from "react";

const TAG_COLOR: Record<string, string> = {
  HIGH:   "#a78bfa",  // violet
  MEDIUM: "#fbbf24",  // amber
  LOW:    "#6b7280",  // gray
};

const NODE_RADIUS = 6;
const CANVAS_W = 700;
const CANVAS_H = 420;
const PADDING = 48;

export const GraphViewer = () => {
  const { result } = useRepoAnalysis();

  const { nodes, nodeMap, edges } = useMemo(() => {
    if (!result?.graph) return { nodes: [], nodeMap: new Map(), edges: [] };

    const raw = result.graph.nodes;
    const rawEdges = result.graph.edges;

    // Simple force-free layout: evenly distribute nodes in concentric rings
    const total = raw.length;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;

    const positioned = raw.map((n, i) => {
      if (n.is_entry) return { ...n, x: cx, y: PADDING };

      const nonEntry = raw.filter((x) => !x.is_entry);
      const idx = nonEntry.findIndex((x) => x.id === n.id);
      const count = nonEntry.length;

      // Two rings: inner (HIGH), outer (rest)
      const isInner = n.tag === "HIGH";
      const innerNodes = nonEntry.filter((x) => x.tag === "HIGH");
      const outerNodes = nonEntry.filter((x) => x.tag !== "HIGH");

      let angle: number;
      let radius: number;

      if (isInner) {
        const pos = innerNodes.findIndex((x) => x.id === n.id);
        angle = (2 * Math.PI * pos) / Math.max(innerNodes.length, 1) - Math.PI / 2;
        radius = Math.min(CANVAS_W, CANVAS_H) * 0.28;
      } else {
        const pos = outerNodes.findIndex((x) => x.id === n.id);
        angle = (2 * Math.PI * pos) / Math.max(outerNodes.length, 1) - Math.PI / 2;
        radius = Math.min(CANVAS_W, CANVAS_H) * 0.44;
      }

      return {
        ...n,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle) + 30,
      };
    });

    const map = new Map(positioned.map((n) => [n.id, n]));
    return { nodes: positioned, nodeMap: map, edges: rawEdges };
  }, [result]);

  if (!result) {
    return (
      <div className="relative flex h-full min-h-[420px] items-center justify-center rounded-xl border border-border bg-gradient-card p-6">
        <div
          className="absolute inset-0 opacity-40 rounded-xl"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl" />
        <div className="relative">
          <EmptyState
            icon={Network}
            title="Dependency graph will appear here"
            description="Once a repository is analyzed, modules and their relationships will render as an interactive graph."
            className="max-w-md border-none bg-card/60 backdrop-blur"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border bg-gradient-card">
      {/* Decorative grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <svg
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="relative z-10 h-full w-full"
        style={{ minHeight: 420 }}
      >
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#6b7280" opacity="0.6" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const src = nodeMap.get(edge.source);
          const tgt = nodeMap.get(edge.target);
          if (!src || !tgt) return null;
          return (
            <line
              key={edge.id}
              x1={src.x} y1={src.y}
              x2={tgt.x} y2={tgt.y}
              stroke="#6b7280"
              strokeWidth={1}
              strokeOpacity={0.35}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const color = node.is_entry ? "#22d3ee" : TAG_COLOR[node.tag] ?? "#6b7280";
          const r = node.is_entry ? NODE_RADIUS + 4 : NODE_RADIUS;
          const label = node.label.split("/").pop() ?? node.label;

          return (
            <g key={node.id}>
              {/* Glow ring for entry */}
              {node.is_entry && (
                <circle cx={node.x} cy={node.y} r={r + 5} fill={color} opacity={0.15} />
              )}
              <circle
                cx={node.x}
                cy={node.y}
                r={r}
                fill={color}
                opacity={node.is_dead ? 0.3 : 0.85}
                stroke={node.is_entry ? "#22d3ee" : "transparent"}
                strokeWidth={node.is_entry ? 2 : 0}
              />
              <text
                x={node.x}
                y={node.y + r + 12}
                textAnchor="middle"
                fontSize={9}
                fill="#9ca3af"
                className="select-none"
              >
                {label.length > 18 ? label.slice(0, 16) + "…" : label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-3 rounded-lg border border-border/40 bg-card/80 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Entry</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-400" /> High</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Medium</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-500" /> Low</span>
      </div>

      <div className="absolute bottom-3 right-3 rounded-lg border border-border/40 bg-card/80 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground">
        {nodes.length} nodes · {edges.length} edges
      </div>
    </div>
  );
};
