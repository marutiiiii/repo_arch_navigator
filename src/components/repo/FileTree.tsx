import { ChevronRight, FileCode, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FileNode {
  name: string;
  type: "folder" | "file";
  children?: FileNode[];
}

// Structural placeholder skeleton — represents an empty file tree state.
const placeholderTree: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      { name: "components", type: "folder", children: [] },
      { name: "pages", type: "folder", children: [] },
      { name: "index.tsx", type: "file" },
    ],
  },
  { name: "public", type: "folder", children: [] },
  { name: "package.json", type: "file" },
  { name: "README.md", type: "file" },
];

const TreeItem = ({ node, depth = 0 }: { node: FileNode; depth?: number }) => {
  const [open, setOpen] = useState(depth < 1);
  const isFolder = node.type === "folder";

  return (
    <div>
      <button
        onClick={() => isFolder && setOpen(!open)}
        className={cn(
          "group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-sm transition-smooth",
          "hover:bg-muted text-muted-foreground hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isFolder ? (
          <>
            <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
            {open ? <FolderOpen className="h-4 w-4 text-primary" /> : <Folder className="h-4 w-4 text-primary" />}
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </>
        )}
        <span className="truncate font-medium">{node.name}</span>
      </button>
      {isFolder && open && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeItem key={child.name} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree = () => {
  return (
    <div className="space-y-0.5">
      {placeholderTree.map((node) => (
        <TreeItem key={node.name} node={node} />
      ))}
    </div>
  );
};
