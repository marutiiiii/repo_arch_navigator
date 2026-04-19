import { useState, useEffect } from "react";
import { Network, FolderTree, Activity, Shield, FileCode } from "lucide-react";
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
  HIGH:   "#a78bfa",
  MEDIUM: "#fbbf24",
  LOW:    "#6b7280",
};

const ROLE_COLOR: Record<string, string> = {
  "Frontend": "#38bdf8",
  "Backend":  "#4ade80",
  "Database": "#f472b6",
  "AI/ML":    "#a78bfa",
  "Config":   "#9ca3af",
};

// --------------------------------------------------------
// 1. Custom Node — supports both folder blocks and file nodes
// --------------------------------------------------------
const ArchNode = ({ data }: NodeProps) => {
  const isFolder = data.is_folder as boolean;
  const isEntry  = data.is_entry as boolean;
  const isDead   = data.is_dead as boolean;
  const tag      = data.tag as string;
  const label    = data.label as string;
  const role     = data.role as string;
  const childCount = data.child_count as number;

  const color = isFolder
    ? (isEntry ? "#22d3ee" : TAG_COLOR[tag] ?? "#6b7280")
    : (ROLE_COLOR[role] ?? TAG_COLOR[tag] ?? "#6b7280");

  // Folder-style block
  if (isFolder) {
    return (
      <div
        className={cn(
          "relative rounded-xl border-2 bg-card/95 backdrop-blur-md px-4 py-3 shadow-md text-center flex flex-col items-center justify-center gap-1.5 min-w-[180px] max-w-[260px]",
          isDead ? "opacity-50" : "opacity-100"
        )}
        style={{ borderColor: color, boxShadow: isEntry ? `0 0 20px ${color}40` : "none", backgroundColor: `${color}10` }}
      >
        <Handle type="target" position={Position.Top} className="w-3 h-3 rounded-full !bg-muted-foreground/60 border-none -mt-1.5" />
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5" style={{ color }} />
          <span className="font-bold text-foreground text-sm tracking-tight truncate max-w-[180px]">{label}</span>
        </div>
        {isEntry && (
          <span className="text-[10px] uppercase tracking-wider font-extrabold bg-background/50 px-2 py-0.5 rounded-full" style={{ color }}>
            Contains Entry Point
          </span>
        )}
        <span className="text-xs text-muted-foreground font-medium font-mono mt-1 bg-muted/40 px-2 py-0.5 rounded-md">
          {childCount} {childCount === 1 ? "file" : "files"}
        </span>
        <Handle type="source" position={Position.Bottom} className="w-3 h-3 rounded-full !bg-muted-foreground/60 border-none -mb-1.5" />
      </div>
    );
  }

  // Individual file node (used in Flow view)
  return (
    <div
      className="relative rounded-lg border bg-card/90 backdrop-blur-md px-3 py-2.5 shadow-sm text-center flex flex-col items-center justify-center gap-1 min-w-[150px] max-w-[220px]"
      style={{ borderColor: color, backgroundColor: `${color}12` }}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 rounded-full !bg-muted-foreground/50 border-none" />
      <div className="flex items-center gap-1.5">
        <FileCode className="h-3.5 w-3.5" style={{ color }} />
        <span className="font-bold text-foreground text-xs truncate max-w-[150px]">{label.split("/").pop()}</span>
      </div>
      <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color }}>{role}</span>
      <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]" title={label}>
        {label.length > 25 ? "…" + label.slice(-25) : label}
      </span>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 rounded-full !bg-muted-foreground/50 border-none" />
    </div>
  );
};

const nodeTypes = { archNode: ArchNode };

// --------------------------------------------------------
// 2. Dagre layout helper
// --------------------------------------------------------
const getLayoutedElements = (nodes: any[], edges: any[], isFlow: boolean, direction = "TB") => {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, nodesep: isFlow ? 50 : 100, ranksep: isFlow ? 90 : 140 });

  nodes.forEach((n) => g.setNode(n.id, { width: n.data?.is_folder ? 220 : 170, height: n.data?.is_folder ? 100 : 80 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);

  return {
    nodes: nodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: pos.x - (n.data?.is_folder ? 110 : 85), y: pos.y - (n.data?.is_folder ? 50 : 40) } };
    }),
    edges,
  };
};

// --------------------------------------------------------
// 3. Main component
// --------------------------------------------------------
interface SystemArchitectureViewerProps {
  onNodeSelect?: (path: string) => void;
}

const SystemArchitectureCanvas = ({ onNodeSelect }: SystemArchitectureViewerProps) => {
  const { result } = useRepoAnalysis();

  const [selectedRole, setSelectedRole] = useState<string>("All Roles");
  const [selectedFlow, setSelectedFlow] = useState<string>("Role View");

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!result?.graph) return;

    let rfNodes: any[] = [];
    let rfEdges: any[] = [];

    // ── FLOW-BASED VIEW ──────────────────────────────────
    if (selectedFlow !== "Role View") {
      const targetFlow = result.flows?.find((f) => f.name === selectedFlow);
      if (targetFlow && targetFlow.steps.length > 0) {
        targetFlow.steps.forEach((stepPath, i) => {
          const fd = result.analysis.find((a) => a.file === stepPath);
          rfNodes.push({
            id: `flow-${i}`,
            type: "archNode",
            data: {
              label: stepPath,
              is_folder: false,
              role: fd?.role ?? "Backend",
              tag: fd?.tag ?? "LOW",
              is_entry: fd?.is_entry ?? false,
              is_dead: false,
            },
            position: { x: 0, y: 0 },
          });
          if (i > 0) {
            rfEdges.push({
              id: `fe-${i}`,
              source: `flow-${i - 1}`,
              target: `flow-${i}`,
              animated: true,
              style: { stroke: "#38bdf8", strokeWidth: 3 },
            });
          }
        });
      }
    }

    // ── ROLE-BASED VIEW ──────────────────────────────────
    else {
      // Build short-path → absolute-id map from graph nodes
      const shortToAbs = new Map<string, string>();
      result.graph.nodes.forEach((n) => shortToAbs.set(n.label, n.id));

      const filteredFiles = result.analysis.filter((f) => {
        if (selectedRole !== "All Roles" && f.role !== selectedRole) return false;
        return true;
      });

      const activeAbsIds = new Set<string>();
      filteredFiles.forEach((f) => {
        const abs = shortToAbs.get(f.file);
        if (abs) activeAbsIds.add(abs);
      });

      // Aggregate into macro folders
      const folderMap = new Map<string, any>();
      const getFolder = (label: string) => {
        const parts = label.replace(/\\/g, "/").split("/");
        if (parts.length <= 1) return "/ (Root Files)";
        if (parts[0] === "src" && parts.length > 2) return `${parts[0]}/${parts[1]}`;
        return parts[0];
      };

      filteredFiles.forEach((f) => {
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
            children: [] as string[],
          });
        }
        const fd = folderMap.get(folder)!;
        fd.child_count += 1;
        const abs = shortToAbs.get(f.file);
        if (abs) fd.children.push(abs);
        if (f.is_entry) fd.is_entry = true;
        if (!f.is_dead) fd.is_dead = false;
        const rank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        if (rank[f.tag] > rank[fd.tag]) fd.tag = f.tag;
      });

      const nodeToFolder = new Map<string, string>();
      folderMap.forEach((fData) => {
        fData.children.forEach((absId: string) => nodeToFolder.set(absId, fData.id));
      });

      // Deduplicate folder-to-folder edges
      const fEdgeMap = new Map<string, any>();
      let ec = 0;
      result.graph.edges.forEach((e) => {
        if (!activeAbsIds.has(e.source) || !activeAbsIds.has(e.target)) return;
        const s = nodeToFolder.get(e.source);
        const t = nodeToFolder.get(e.target);
        if (s && t && s !== t) {
          const key = `${s}=>${t}`;
          if (!fEdgeMap.has(key)) {
            fEdgeMap.set(key, {
              id: `fe_${ec++}`,
              source: s,
              target: t,
              animated: true,
              style: { stroke: "#6b7280", opacity: 0.8, strokeWidth: 3 },
            });
          }
        }
      });

      rfNodes = Array.from(folderMap.values()).map((n) => ({
        id: n.id,
        type: "archNode",
        data: { ...n },
        position: { x: 0, y: 0 },
      }));
      rfEdges = Array.from(fEdgeMap.values());
    }

    if (rfNodes.length > 0) {
      const layouted = getLayoutedElements(rfNodes, rfEdges, selectedFlow !== "Role View");
      setNodes(layouted.nodes);
      setEdges(layouted.edges);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [result, selectedRole, selectedFlow, setNodes, setEdges]);

  // ── Empty state ──
  if (!result) {
    return (
      <div className="relative flex h-full min-h-[500px] items-center justify-center rounded-xl border border-border bg-gradient-card p-6">
        <EmptyState
          icon={Network}
          title="System Architecture view"
          description="Analyze a repository first, then explore files by Role or trace execution Flows."
          className="max-w-md border-none bg-card/60 backdrop-blur"
        />
      </div>
    );
  }

  const roleOptions = ["All Roles", "Frontend", "Backend", "Database", "AI/ML", "Config"];
  const flowOptions = ["Role View", ...(result.flows?.map((f) => f.name) || [])];

  return (
    <div className="flex flex-col h-full min-h-[600px] w-full rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-border bg-muted/20 px-4 py-2 gap-3 shadow-sm z-20">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground/80 tracking-tight">
          <Activity className="h-4 w-4 text-primary" /> System Architecture
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Role selector */}
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setSelectedFlow("Role View"); }}
              className="px-2 py-1 bg-background border border-border rounded-md text-xs font-medium text-foreground outline-none focus:border-primary/50"
            >
              {roleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Flow selector */}
          {flowOptions.length > 1 && (
            <div className="flex items-center gap-1.5 ml-3 pl-3 border-l border-border/60">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <select
                value={selectedFlow}
                onChange={(e) => { setSelectedFlow(e.target.value); setSelectedRole("All Roles"); }}
                className="px-2 py-1 bg-primary/10 border border-primary/20 rounded-md text-xs font-bold text-primary outline-none"
              >
                {flowOptions.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="w-full bg-background/50 relative flex-1" style={{ height: "600px" }}>
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground z-10">
            No files found for this role.
          </div>
        )}

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
              if (n.data?.role) return ROLE_COLOR[n.data.role as string] ?? "#6b7280";
              if (n.data?.tag === "HIGH") return "#a78bfa";
              if (n.data?.tag === "MEDIUM") return "#fbbf24";
              return "#6b7280";
            }}
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex gap-3 rounded-md border border-border bg-card/95 backdrop-blur px-3 py-2 text-[10px] text-muted-foreground font-medium shadow-md">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400 border border-sky-500/50" /> Frontend</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400 border border-green-500/50" /> Backend</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-400 border border-pink-500/50" /> Database</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400 border border-violet-500/50" /> AI/ML</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-400 border border-gray-500/50" /> Config</span>
        </div>
      </div>
    </div>
  );
};

export const SystemArchitectureViewer = (props: SystemArchitectureViewerProps) => (
  <ReactFlowProvider>
    <SystemArchitectureCanvas {...props} />
  </ReactFlowProvider>
);
