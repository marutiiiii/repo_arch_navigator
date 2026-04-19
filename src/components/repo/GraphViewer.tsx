import { useMemo, useState, useEffect } from "react";
import { Network, Filter, FolderTree } from "lucide-react";
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
// 1. Custom Folder Node Component
// --------------------------------------------------------
const FolderNode = ({ data }: NodeProps) => {
  const isEntry = data.is_entry as boolean;
  const isDead = data.is_dead as boolean;
  const childCount = data.child_count as number;
  const tag = data.tag as string;
  const label = data.label as string;
  
  const color = isEntry ? "#22d3ee" : TAG_COLOR[tag] ?? "#6b7280";

  return (
    <div 
      className={cn(
        "relative rounded-xl border bg-card/95 backdrop-blur-md px-4 py-3 shadow-md text-center flex flex-col items-center justify-center gap-1.5 min-w-[180px] max-w-[260px] border-2",
        isDead ? "opacity-50" : "opacity-100"
      )}
      style={{
        borderColor: color,
        boxShadow: isEntry ? `0 0 20px ${color}40` : 'none',
        backgroundColor: `${color}10`
      }}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full !bg-muted-foreground/60 border-none -mt-1.5" />
      
      <div className="flex items-center gap-2">
        <FolderTree className="h-5 w-5" style={{ color }} />
        <span className="font-bold text-foreground text-sm tracking-tight break-words truncate max-w-[180px]">
           {label}
        </span>
      </div>

      {isEntry && (
        <span className="text-[10px] uppercase tracking-wider font-extrabold bg-background/50 px-2 py-0.5 rounded-full" style={{ color }}>
          Contains Entry Point
        </span>
      )}
      
      <span className="text-xs text-muted-foreground font-medium font-mono mt-1 bg-muted/40 px-2 py-0.5 rounded-md">
        {childCount} {childCount === 1 ? 'file' : 'files'}
      </span>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full !bg-muted-foreground/60 border-none -mb-1.5" />
    </div>
  );
};

const nodeTypes = {
  repoNode: FolderNode,
};

// --------------------------------------------------------
// 2. Dagre Layout Function
// --------------------------------------------------------
const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Wider separation for the large folder blocks
  dagreGraph.setGraph({ rankdir: direction, nodesep: 100, ranksep: 140 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 100 });
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
        position: { x: nodeWithPosition.x - 110, y: nodeWithPosition.y - 50 },
      };
    }),
    edges,
  };
};

// --------------------------------------------------------
// 3. Main Viewer Component
// --------------------------------------------------------
interface GraphViewerProps {
  onNodeSelect?: (path: string) => void;
}

const GraphCanvas = ({ onNodeSelect }: GraphViewerProps) => {
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

    // --- FOLDER LEVEL AGGREGATION ---
    const folderMap = new Map(); // folderPath -> { data ... }
    
    // Smart Macro-Architecture grouping
    const getFolder = (label: string) => {
      const parts = label.replace(/\\/g, "/").split("/");
      if (parts.length <= 1) return "/ (Root Files)";
      
      // If it's in a massive top-level directory like "src", go one level deep to split components/pages
      if (parts[0] === 'src' && parts.length > 2) {
         return `${parts[0]}/${parts[1]}`;
      }
      
      // Otherwise, group by the top-level directory (e.g. backend, scripts)
      return parts[0];
    };

    activeNodes.forEach(n => {
      const folder = getFolder(n.label);
      if (!folderMap.has(folder)) {
        folderMap.set(folder, {
          id: `dir-${folder}`,
          label: folder,
          is_folder: true,
          child_count: 0,
          is_entry: false,
          is_dead: true, 
          tag: "LOW",
          children: []
        });
      }
      const f = folderMap.get(folder);
      f.child_count += 1;
      f.children.push(n.id);
      if (n.is_entry) f.is_entry = true;
      if (!n.is_dead) f.is_dead = false;

      // Tag upgrade logic: HIGH > MEDIUM > LOW
      const tagRank: Record<string, number> = { "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
      if (tagRank[n.tag] > tagRank[f.tag as string]) {
         f.tag = n.tag;
      }
    });

    const nodeToFolder = new Map();
    folderMap.forEach((fData, folderPath) => {
      fData.children.forEach((nId: string) => nodeToFolder.set(nId, fData.id));
    });

    const groupNodes = Array.from(folderMap.values());
    
    // Deduplicate edges folder-to-folder
    const folderEdges = new Map(); // "source-target" -> edge object
    let edgeCounter = 0;

    result.graph.edges.forEach(e => {
       const srcFolder = nodeToFolder.get(e.source);
       const tgtFolder = nodeToFolder.get(e.target);

       // We only draw edge if both folders survived the visibility filter,
       // AND it's not a circular internal edge (folder pointing to itself).
       if (srcFolder && tgtFolder && srcFolder !== tgtFolder) {
          const key = `${srcFolder}==>${tgtFolder}`;
          if (!folderEdges.has(key)) {
             folderEdges.set(key, {
                id: `f_edge_${edgeCounter++}`,
                source: srcFolder,
                target: tgtFolder,
                animated: true,
                style: { stroke: "#6b7280", opacity: 0.8, strokeWidth: 3 } // Thicker structural lines
             });
          }
       }
    });

    const rfNodes = groupNodes.map((n) => ({
       id: n.id,
       type: "repoNode",
       data: { ...n },
       position: { x: 0, y: 0 }
    }));
    
    const rfEdges = Array.from(folderEdges.values());

    const layouted = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

  }, [result, setNodes, setEdges]);

  if (!result) {
    return (
      <div className="relative flex h-full min-h-[500px] items-center justify-center rounded-xl border border-border bg-gradient-card p-6">
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl pointer-events-none" />
        <EmptyState
          icon={Network}
          title="Dependency graph will appear here"
          description="Once a repository is analyzed, modules and their relationships will render as a structural data flow graph."
          className="max-w-md border-none bg-card/60 backdrop-blur"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      
      {/* Top Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/20 px-4 py-2 gap-4 shadow-sm z-20">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 mr-4 tracking-tight">
          <FolderTree className="h-4 w-4 text-primary" /> Architectural Data Flow
        </div>
        
        <div className="flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold tracking-wider uppercase">
           Macro-Architecture Mode Active
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="w-full bg-background/50 relative" style={{ height: "600px" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            if (onNodeSelect && node.data?.label) {
              onNodeSelect(node.data.label as string);
            }
          }}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
          attributionPosition="bottom-right"
        >
          <Background color="#a3a3a3" variant={BackgroundVariant.Dots} gap={32} size={1.5} opacity={0.3} />
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
        <div className="absolute bottom-4 left-4 z-10 flex gap-4 rounded-md border border-border bg-card/95 backdrop-blur px-4 py-2 text-[10px] text-muted-foreground font-medium shadow-md">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 border border-cyan-500/50" /> Contains Entry</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400 border border-violet-500/50" /> High Impact Subsystem</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 border border-amber-500/50" /> Standard Library</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-500 border border-gray-600/50" /> Utilities / Configs</span>
        </div>
      </div>
    </div>
  );
};

export const GraphViewer = (props: GraphViewerProps) => (
   <ReactFlowProvider>
     <GraphCanvas {...props} />
   </ReactFlowProvider>
);
