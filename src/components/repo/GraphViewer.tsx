import { useMemo, useState, useEffect } from "react";
import { Network, FolderTree, Activity, Shield } from "lucide-react";
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

const ROLE_COLOR: Record<string, string> = {
  "Frontend": "#38bdf8", // light blue
  "Backend": "#4ade80",  // green
  "Database": "#f472b6", // pink
  "AI/ML": "#a78bfa",    // purple
  "Config": "#9ca3af",   // gray
};

// --------------------------------------------------------
// 1. Custom Node Component
// --------------------------------------------------------
const CustomGraphNode = ({ data }: NodeProps) => {
  const isEntry = data.is_entry as boolean;
  const isDead = data.is_dead as boolean;
  const isFolder = data.is_folder as boolean;
  const childCount = data.child_count as number;
  const tag = data.tag as string;
  const label = data.label as string;
  const role = data.role as string;
  
  const color = isFolder 
    ? (isEntry ? "#22d3ee" : TAG_COLOR[tag] ?? "#6b7280") 
    : (ROLE_COLOR[role] ?? TAG_COLOR[tag] ?? "#6b7280");

  if (isFolder) {
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
  }

  // Raw file node (used for Flow views)
  return (
    <div 
      className={cn(
        "relative rounded-md border bg-card/90 backdrop-blur-md px-3 py-2 text-xs shadow-sm text-center flex flex-col items-center justify-center gap-1 min-w-[140px] max-w-[200px]"
      )}
      style={{
        borderColor: color,
        backgroundColor: `${color}15`
      }}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2 rounded-full !bg-muted-foreground/50 border-none" />
      
      <span className="font-bold text-foreground break-words truncate w-full">
         {label.split("/").pop() ?? label}
      </span>
      {role && (
        <span className="text-[9px] uppercase tracking-wider font-bold mt-0.5" style={{ color }}>
          {role}
        </span>
      )}
      <span className="text-[10px] text-muted-foreground mt-0.5" title={label}>
        {label.length > 22 ? "..." + label.slice(-22) : label}
      </span>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 rounded-full !bg-muted-foreground/50 border-none" />
    </div>
  );
};

const nodeTypes = {
  repoNode: CustomGraphNode,
};

// --------------------------------------------------------
// 2. Dagre Layout Function
// --------------------------------------------------------
const getLayoutedElements = (nodes: any[], edges: any[], isFlow: boolean, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({ rankdir: direction, nodesep: isFlow ? 40 : 100, ranksep: isFlow ? 80 : 140 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { 
      width: node.data?.is_folder ? 220 : 160, 
      height: node.data?.is_folder ? 100 : 70 
    });
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
        position: { 
          x: nodeWithPosition.x - (node.data?.is_folder ? 110 : 80), 
          y: nodeWithPosition.y - (node.data?.is_folder ? 50 : 35) 
        },
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
  
  // State
  const [selectedRole, setSelectedRole] = useState<string>("All Roles");
  const [selectedFlow, setSelectedFlow] = useState<string>("Macro Architecture");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!result?.graph) return;

    let rfNodes = [];
    let rfEdges = [];

    // --- CASE 1: FLOW-BASED VIEW ---
    if (selectedFlow !== "Macro Architecture") {
      const targetFlow = result.flows?.find(f => f.name === selectedFlow);
      if (targetFlow && targetFlow.steps.length > 0) {
        
        // Build nodes directly from flow steps
        targetFlow.steps.forEach((stepPath, i) => {
          // find file analysis to get role
          const fileData = result.analysis.find(f => f.file === stepPath);
          
          rfNodes.push({
            id: `flow-node-${i}`,
            type: "repoNode",
            data: {
              id: stepPath, 
              label: stepPath, 
              is_folder: false,
              role: fileData?.role ?? "Backend",
              tag: fileData?.tag ?? "LOW",
              is_entry: fileData?.is_entry ?? false,
              is_dead: false
            },
            position: { x: 0, y: 0 }
          });

          // Build linear edges for the execution flow path
          if (i > 0) {
            rfEdges.push({
              id: `flow-edge-${i}`,
              source: `flow-node-${i-1}`,
              target: `flow-node-${i}`,
              animated: true,
              style: { stroke: "#38bdf8", opacity: 1, strokeWidth: 3 } // bright blue workflow trace
            });
          }
        });
      }
    } 
    // --- CASE 2: ROLE-BASED MACRO VIEW ---
    else {
      let activeFileIds = new Set<string>();
      
      // Filter the underlying files by role if requested
      const filteredFiles = result.analysis.filter(f => {
         if (selectedRole !== "All Roles" && f.role !== selectedRole) return false;
         return true;
      });
      filteredFiles.forEach(f => activeFileIds.add(f.file));

      const folderMap = new Map(); 
      
      const getFolder = (label: string) => {
        const parts = label.replace(/\\/g, "/").split("/");
        if (parts.length <= 1) return "/ (Root Files)";
        if (parts[0] === 'src' && parts.length > 2) {
           return `${parts[0]}/${parts[1]}`;
        }
        return parts[0];
      };

      filteredFiles.forEach(f => {
        const folder = getFolder(f.file);
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
        const fd = folderMap.get(folder);
        fd.child_count += 1;
        fd.children.push(f.file);
        if (f.is_entry) fd.is_entry = true;
        if (!f.is_dead) fd.is_dead = false;

        const tagRank: Record<string, number> = { "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
        if (tagRank[f.tag] > tagRank[fd.tag as string]) fd.tag = f.tag;
      });

      const nodeToFolder = new Map();
      folderMap.forEach((fData, folderPath) => {
        fData.children.forEach((nId: string) => nodeToFolder.set(nId, fData.id));
      });

      const groupNodes = Array.from(folderMap.values());
      const folderEdges = new Map(); 
      let edgeCounter = 0;

      result.graph.edges.forEach(e => {
         if (!activeFileIds.has(e.source) || !activeFileIds.has(e.target)) return;

         const srcFolder = nodeToFolder.get(e.source);
         const tgtFolder = nodeToFolder.get(e.target);

         if (srcFolder && tgtFolder && srcFolder !== tgtFolder) {
            const key = `${srcFolder}==>${tgtFolder}`;
            if (!folderEdges.has(key)) {
               folderEdges.set(key, {
                  id: `f_edge_${edgeCounter++}`,
                  source: srcFolder,
                  target: tgtFolder,
                  animated: true,
                  style: { stroke: "#6b7280", opacity: 0.8, strokeWidth: 3 }
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
    }

    const layouted = getLayoutedElements(rfNodes, rfEdges, selectedFlow !== "Macro Architecture");
    setNodes(layouted.nodes);
    setEdges(layouted.edges);

  }, [result, selectedRole, selectedFlow, setNodes, setEdges]);

  if (!result) {
    return (
      <div className="relative flex h-full min-h-[500px] items-center justify-center rounded-xl border border-border bg-gradient-card p-6">
        <div className="absolute -right-10 top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-primary-glow/10 blur-3xl pointer-events-none" />
        <EmptyState
          icon={Network}
          title="Loading Engine..."
          description="Awaiting backend visualization data."
          className="max-w-md border-none bg-card/60 backdrop-blur"
        />
      </div>
    );
  }

  // Compile options
  const roleOptions = ["All Roles", "Frontend", "Backend", "Database", "AI/ML", "Config"];
  const flowOptions = ["Macro Architecture", ...(result.flows?.map(f => f.name) || [])];

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      
      {/* Top Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/20 px-4 py-2 gap-4 shadow-sm z-20">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 mr-4 tracking-tight">
          <FolderTree className="h-4 w-4 text-primary" /> Architecture Engine
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Roles Selector */}
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <select 
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setSelectedFlow("Macro Architecture"); // switch off flow if changing roles
              }}
              className="px-2 py-1 bg-background border border-border rounded-md text-xs font-medium text-foreground outline-none focus:border-primary/50"
            >
              {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Workflow Selector */}
          {flowOptions.length > 1 && (
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-border/60">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <select 
                value={selectedFlow}
                onChange={(e) => {
                  setSelectedFlow(e.target.value);
                  setSelectedRole("All Roles"); // switch off role if picking precise flow
                }}
                className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs font-bold text-primary outline-none"
              >
                {flowOptions.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="w-full bg-background/50 relative flex-1" style={{ height: "600px" }}>
        
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground z-10 backdrop-blur-sm">
             No components matched the selected queries.
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => {
            if (onNodeSelect && node.data?.id) {
              // Pass the raw path for both flows and folders
              onNodeSelect(node.data.id as string);
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
              if (n.data?.role) return ROLE_COLOR[n.data.role as string] ?? "#6b7280";
              if (n.data?.tag === "HIGH") return "#a78bfa";
              if (n.data?.tag === "MEDIUM") return "#fbbf24";
              return "#6b7280";
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>

        {/* Dynamic Legend */}
        {selectedFlow !== "Macro Architecture" ? (
          <div className="absolute bottom-4 left-4 z-10 flex gap-4 rounded-md border border-border bg-card/95 backdrop-blur px-4 py-2 text-[10px] text-muted-foreground font-medium shadow-md">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400 border border-sky-500/50" /> Frontend</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 border border-green-500/50" /> Backend</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-400 border border-pink-500/50" /> Database</span>
          </div>
        ) : (
          <div className="absolute bottom-4 left-4 z-10 flex gap-4 rounded-md border border-border bg-card/95 backdrop-blur px-4 py-2 text-[10px] text-muted-foreground font-medium shadow-md">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-cyan-400 border border-cyan-500/50" /> Contains Entry</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400 border border-violet-500/50" /> High Impact Subsystem</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 border border-amber-500/50" /> Custom Lib</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const GraphViewer = (props: GraphViewerProps) => (
   <ReactFlowProvider>
     <GraphCanvas {...props} />
   </ReactFlowProvider>
);
