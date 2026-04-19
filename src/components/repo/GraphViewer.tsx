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
// 1. Custom Node Component
// --------------------------------------------------------
const RepoNode = ({ data }: NodeProps) => {
  const isEntry = data.is_entry as boolean;
  const isDead = data.is_dead as boolean;
  const isFolder = data.is_folder as boolean;
  const childCount = data.child_count as number;
  const tag = data.tag as string;
  const label = data.label as string;
  
  const color = isEntry ? "#22d3ee" : TAG_COLOR[tag] ?? "#6b7280";

  return (
    <div 
      className={cn(
        "relative rounded-md border bg-card/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm text-center flex flex-col items-center justify-center gap-1",
        isFolder ? "min-w-[160px] max-w-[240px] border-2 border-dashed" : "min-w-[120px] max-w-[200px]" ,
        isDead ? "opacity-50" : "opacity-100"
      )}
      style={{
        borderColor: color,
        boxShadow: isEntry ? `0 0 15px ${color}40` : 'none',
        backgroundColor: isFolder ? `${color}15` : 'inherit'
      }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-full !bg-muted-foreground/50 border-none" />
      
      {isFolder && <FolderTree className="h-4 w-4 mb-0.5" style={{ color }} />}

      {isEntry && (
        <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>
          Entry Point
        </span>
      )}
      <span className="font-medium text-foreground break-words truncate w-full">
         {label.split("/").pop() ?? label}
      </span>
      <span className="text-[10px] text-muted-foreground mt-0.5" title={label}>
        {isFolder ? `${childCount} files inside` : (label.length > 22 ? "..." + label.slice(-22) : label)}
      </span>

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
    const isFolder = node.data?.is_folder;
    dagreGraph.setNode(node.id, { width: isFolder ? 180 : 140, height: isFolder ? 80 : 60 });
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
        position: { x: nodeWithPosition.x - (node.data?.is_folder ? 90 : 70), y: nodeWithPosition.y - (node.data?.is_folder ? 40 : 30) },
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
  const [groupByFolder, setGroupByFolder] = useState(false);
  const [showLowPriority, setShowLowPriority] = useState(false);
  const [showDeadCode, setShowDeadCode] = useState(false);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Process data when result or filters change
  useEffect(() => {
    if (!result?.graph) return;

    let activeNodes = result.graph.nodes;
    let rfNodes = [];
    let rfEdges = [];

    // Pre-filter files to calculate boundaries
    const filteredFileNodes = activeNodes.filter(n => {
       if (!showLowPriority && n.tag === "LOW" && !n.is_entry) return false;
       if (!showDeadCode && n.is_dead && !n.is_entry) return false;
       return true;
    });

    if (groupByFolder) {
       // --- FOLDER LEVEL AGGREGATION ---
       const folderMap = new Map(); // folderPath -> { data ... }
       
       const getFolder = (label: string) => {
         const parts = label.replace(/\\/g, "/").split("/");
         if (parts.length <= 1) return "/ (root)";
         parts.pop(); // remove the filename
         return parts.join("/");
       };

       filteredFileNodes.forEach(n => {
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
                   style: { stroke: "#6b7280", opacity: 0.8, strokeWidth: 2 }
                });
             }
          }
       });

       rfNodes = groupNodes.map((n) => ({
          id: n.id,
          type: "repoNode",
          data: { ...n },
          position: { x: 0, y: 0 }
       }));
       rfEdges = Array.from(folderEdges.values());

    } else {
       // --- STANDARD FILE LEVEL ---
       const activeNodeIds = new Set(filteredFileNodes.map(n => n.id));
       const activeEdges = result.graph.edges.filter(
         e => activeNodeIds.has(e.source) && activeNodeIds.has(e.target)
       );

       rfNodes = filteredFileNodes.map((n) => ({
         id: n.id,
         type: "repoNode",
         data: { ...n, is_folder: false },
         position: { x: 0, y: 0 },
       }));

       rfEdges = activeEdges.map((e) => ({
         id: e.id,
         source: e.source,
         target: e.target,
         animated: true,
         style: { stroke: "#6b7280", opacity: 0.5 },
       }));
    }

    const layouted = getLayoutedElements(rfNodes, rfEdges);
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

  }, [result, showLowPriority, showDeadCode, groupByFolder, setNodes, setEdges]);

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
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/20 px-4 py-2 gap-4 shadow-sm z-20">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 mr-4">
          <Filter className="h-3.5 w-3.5" /> Graph Controls
        </div>
        
        <div className="flex flex-wrap gap-4 items-center">
          {/* Main Visual Option  */}
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground transition-colors group border-r border-border/60 pr-4 mr-1">
            <input 
              type="checkbox" 
              checked={groupByFolder} 
              onChange={(e) => setGroupByFolder(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span className={groupByFolder ? "text-primary font-bold" : "text-muted-foreground font-medium"}>
              Group by Folders
            </span>
          </label>

          {/* Filtering Sub-options */}
          <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground transition-colors group">
            <input 
              type="checkbox" 
              checked={showLowPriority} 
              onChange={(e) => setShowLowPriority(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            <span className={showLowPriority ? "text-foreground font-medium" : "text-muted-foreground"}>
              Include Low-Priority Configs
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
              Include Dead Code
            </span>
          </label>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="w-full bg-background relative" style={{ height: "600px" }}>
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
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400" /> Entry Node</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-violet-400" /> High Score</span>
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
