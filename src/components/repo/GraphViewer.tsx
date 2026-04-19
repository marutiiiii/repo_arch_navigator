import { Network } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { useMemo } from "react";
import dagre from "dagre";

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

  const { nodes, nodeMap, edges, bbox } = useMemo(() => {
    if (!result?.graph || result.graph.nodes.length === 0) 
      return { nodes: [], nodeMap: new Map(), edges: [], bbox: { w: CANVAS_W, h: CANVAS_H } };

    const raw = result.graph.nodes;
    const rawEdges = result.graph.edges;

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to dagre
    raw.forEach((n) => {
      // rough sizing to prevent overlap. The circle itself is small, but labeling needs space.
      g.setNode(n.id, { width: 140, height: 60 });
    });

    // Add edges to dagre
    rawEdges.forEach((e) => {
      g.setEdge(e.source, e.target);
    });

    // Compute topological layout
    dagre.layout(g);

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    // Get nodes
    const positioned = raw.map((n) => {
      const dNode = g.node(n.id);
      if (dNode.x < minX) minX = dNode.x;
      if (dNode.y < minY) minY = dNode.y;
      if (dNode.x > maxX) maxX = dNode.x;
      if (dNode.y > maxY) maxY = dNode.y;
      return { ...n, x: dNode.x, y: dNode.y };
    });

    // Apply padding
    const paddingX = 120;
    const paddingY = 80;
    const width = maxX - minX + paddingX * 2;
    const height = maxY - minY + paddingY * 2;

    const finalPlaced = positioned.map((n) => ({
      ...n,
      x: n.x - minX + paddingX,
      y: n.y - minY + paddingY,
    }));

    const map = new Map(finalPlaced.map((n) => [n.id, n]));
    return { 
      nodes: finalPlaced, 
      nodeMap: map, 
      edges: rawEdges, 
      bbox: { w: Math.max(width, CANVAS_W), h: Math.max(height, CANVAS_H) } 
    };
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
        viewBox={`0 0 ${bbox.w} ${bbox.h}`}
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
