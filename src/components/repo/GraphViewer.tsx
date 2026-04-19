import { useMemo, useState, useEffect } from "react";
import { Network, Filter } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import dagre from "dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  NodeProps,
  BackgroundVariant
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

const TAG_COLOR: Record<string, string> = {
  HIGH:   "#a78bfa",  // violet
  MEDIUM: "#fbbf24",  // amber
  LOW:    "#6b7280",  // gray
};

// --------------------------------------------------------
// 1. Custom Node Component
// --------------------------------------------------------
const RepoNode = ({ data }: NodeProps) => {
  const isEntry = data.is_entry as boolean;
  const isDead = data.is_dead as boolean;
  const tag = data.tag as string;
  const label = data.label as string;
  
  const color = isEntry ? "#22d3ee" : TAG_COLOR[tag] ?? "#6b7280";

  return (
    <div 
      className={cn(
        "relative rounded-md border bg-card/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm min-w-[120px] max-w-[200px] text-center",
        isDead ? "opacity-50" : "opacity-100"
      )}
      style={{
        borderColor: color,
        boxShadow: isEntry ? `0 0 15px ${color}40` : 'none'
      }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-full !bg-muted-foreground/50 border-none" />
      
      <div className="flex flex-col items-center justify-center gap-1">
        {isEntry && (
          <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>
            Entry Point
          </span>
        )}
        <span className="font-medium text-foreground break-words truncate w-full">
          {label.split("/").pop() ?? label}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5" title={label}>
          {label.length > 20 ? "..." + label.slice(-20) : label}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-full !bg-muted-foreground/50 border-none" />
    </div>
  );
};

const nodeTypes = {
  repoNode: RepoNode,
};

// --------------------------------------------------------
// 2. Dagre Layout Function
// --------------------------------------------------------
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => {
    // Rough estimate of node width/height for layouting
    dagreGraph.setNode(node.id, { width: 140, height: 60 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        // offset center correctly
        position: { x: nodeWithPosition.x - 70, y: nodeWithPosition.y - 30 },
      };
    }),
    edges,
  };
};

// --------------------------------------------------------
// 3. Main Viewer Component
// --------------------------------------------------------
const GraphCanvas = () => {
  const { result } = useRepoAnalysis();
  
  // Filtering states
  const [showLowPriority, setShowLowPriority] = useState(false);
  const [showDeadCode, setShowDeadCode] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Process data when result or filters change
  useEffect(() => {
    if (!result?.graph) return;

    let activeNodes = result.graph.nodes;
    
    // Apply Filters
    if (!showLowPriority) {
      activeNodes = activeNodes.filter(n => n.tag !== "LOW" || n.is_entry);
    }
    if (!showDeadCode) {
      activeNodes = activeNodes.filter(n => !n.is_dead || n.is_entry);
    }

    // Safety net: ensure edge targets/sources exist in active nodes
    const activeNodeIds = new Set(activeNodes.map(n => n.id));
    const activeEdges = result.graph.edges.filter(
      e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
    );

    // Map to React Flow format
    const rfNodes = activeNodes.map((n) => ({
      id: n.id,
      type: "repoNode",
      data: { ...n },
      position: { x: 0, y: 0 }, // Dagre will overwrite this
    }));

    const rfEdges = activeEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
      style: { stroke: "#6b7280", opacity: 0.5 },
    }));

    const layouted = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

  }, [result, showLowPriority, showDeadCode, setNodes, setEdges]);

  if (!result) {
    return (
      <div className="relative flex h-full min-h-[500px] items-center justify-center rounded-xl border border-border bg-gradient-card p-6">
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl pointer-events-none" />
        <EmptyState
          icon={Network}
          title="Dependency graph will appear here"
          description="Once a repository is analyzed, modules and their relationships will render as an interactive graph."
          className="max-w-md border-none bg-card/60 backdrop-blur"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      
      {/* Top Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/40 px-4 py-2 gap-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mr-4">
          <Filter className="h-3.5 w-3.5" /> Filter Noise
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground transition-colors group">
            <input 
              type="checkbox" 
              checked={showLowPriority} 
              onChange={(e) => setShowLowPriority(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span className={showLowPriority ? "text-foreground font-medium" : "text-muted-foreground"}>
              Show Low-Priority Configs
            </span>
          </label>
          
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground transition-colors group">
            <input 
              type="checkbox" 
              checked={showDeadCode} 
              onChange={(e) => setShowDeadCode(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
             <span className={showDeadCode ? "text-foreground font-medium" : "text-muted-foreground"}>
              Show Unused (Dead) Code
            </span>
          </label>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="flex-1 w-full bg-background relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#ccc" variant={BackgroundVariant.Dots} gap={24} size={1} />
          <Controls className="bg-card border-border shadow-md" />
          <MiniMap 
            className="bg-card border-border shadow-md rounded-md overflow-hidden !bottom-4 !right-4"
            nodeColor={(n) => {
              if (n.data?.is_entry) return "#22d3ee";
              if (n.data?.tag === "HIGH") return "#a78bfa";
              if (n.data?.tag === "MEDIUM") return "#fbbf24";
              return "#6b7280";
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-3 rounded-md border border-border/40 bg-card/90 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground shadow-sm">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Entry</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-400" /> High</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> Medium</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-500" /> Low</span>
        </div>
      </div>
    </div>
  );
};

export const GraphViewer = () => (
   <ReactFlowProvider>
     <GraphCanvas />
   </ReactFlowProvider>
);
