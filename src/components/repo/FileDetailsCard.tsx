import {
  FileCode, Tag, Zap, Skull, ArrowRightLeft, BookOpen, FolderTree, ChevronRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { SelectionItem } from "@/pages/RepositoryAnalysis";

interface Props {
  selectedItem?: SelectionItem;
  onFileSelect?: (path: string) => void;
}

export const FileDetailsCard = ({ selectedItem, onFileSelect }: Props) => {
  const { result } = useRepoAnalysis();

  if (!result || !selectedItem) {
    return (
      <EmptyState
        icon={FileCode}
        title="Select an item"
        description="Click a file or folder graph node to see its details."
      />
    );
  }

  const tagColor: Record<string, string> = {
    HIGH:   "bg-primary/20 text-primary border-primary/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LOW:    "bg-muted text-muted-foreground border-border",
  };

  // ----------------------------------------------------------------------
  // FOLDER VIEW
  // ----------------------------------------------------------------------
  if (selectedItem.type === 'folder') {
    const folderPath = selectedItem.path;
    const isRoot = folderPath === "/ (Root Files)";
    
    // Find all files in this macro-folder
    const childFiles = result.analysis.filter(f => {
      const normalizedPath = f.file.replace(/\\/g, "/");
      if (isRoot) return normalizedPath.indexOf("/") === -1;
      return normalizedPath.startsWith(folderPath + "/") || normalizedPath === folderPath;
    });

    // Sort: HIGH > MEDIUM > LOW
    const rank: Record<string, number> = { "HIGH": 3, "MEDIUM": 2, "LOW": 1 };
    childFiles.sort((a, b) => rank[b.tag] - rank[a.tag]);

    return (
      <div className="space-y-4 flex flex-col h-full max-h-[640px]">
        {/* Header */}
        <div className="flex items-start gap-2 border-b border-border/50 pb-3">
          <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex flex-col">
             <p className="break-all text-xs font-mono font-bold text-foreground leading-relaxed">
               {folderPath}
             </p>
             <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
               {childFiles.length} {childFiles.length === 1 ? 'file' : 'files'} in directory
             </p>
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 pb-4">
          {childFiles.map(f => {
            const fileName = f.file.split(/[/\\]/).pop() || f.file;
            return (
              <div 
                key={f.file}
                onClick={() => onFileSelect?.(f.file)}
                className="group flex items-center justify-between p-2.5 rounded-md border border-border/40 bg-card/40 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex flex-col gap-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-[11px] font-mono text-foreground truncate max-w-[140px] font-medium">
                      {fileName}
                    </span>
                  </div>
                  <div className="flex gap-1 ml-4.5">
                    <Badge className={`text-[9px] px-1.5 py-0 border ${tagColor[f.tag]}`}>
                      {f.tag}
                    </Badge>
                    {f.is_entry && (
                      <Badge className="text-[9px] px-1.5 py-0 border bg-green-500/10 text-green-400 border-green-500/20">
                        ENTRY
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // FILE VIEW (Original Logic)
  // ----------------------------------------------------------------------
  const selectedFile = selectedItem.path;
  const fileData = result.analysis.find((f) => f.file.endsWith(selectedFile));
  const explanation = result.explanations.file_explanations[selectedFile]
    ?? result.explanations.file_explanations[
      Object.keys(result.explanations.file_explanations).find((k) => k.endsWith(selectedFile)) ?? ""
    ];

  // Count incoming deps (how many files import this one)
  const dependents = result.graph.edges.filter((e) =>
    e.target.endsWith(selectedFile.replace(/\//g, "\\"))
    || e.target.replace(/\\/g, "/").endsWith(selectedFile)
  ).length;

  const imports = result.graph.edges.filter((e) =>
    e.source.endsWith(selectedFile.replace(/\//g, "\\"))
    || e.source.replace(/\\/g, "/").endsWith(selectedFile)
  ).length;

  return (
    <div className="space-y-4">
      {/* File name */}
      <div className="flex items-start gap-2">
        <FileCode className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="break-all text-xs font-mono font-medium text-foreground leading-relaxed">
          {selectedFile}
        </p>
      </div>

      {/* Badges */}
      {fileData && (
        <div className="flex flex-wrap gap-2">
          <Badge className={`text-[10px] ${tagColor[fileData.tag]}`}>
            <Tag className="mr-1 h-3 w-3" />
            {fileData.tag}
          </Badge>
          {fileData.is_entry && (
            <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">
              <Zap className="mr-1 h-3 w-3" />
              Entry Point
            </Badge>
          )}
          {fileData.is_dead && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              <Skull className="mr-1 h-3 w-3" />
              Dead Code
            </Badge>
          )}
        </div>
      )}

      {/* Stats grid */}
      {fileData && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground">{fileData.score}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Importance</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/60 p-3 text-center">
            <ArrowRightLeft className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-[10px] text-muted-foreground">
              {imports} out · {dependents} in
            </p>
          </div>
        </div>
      )}

      {/* AI Explanation */}
      {explanation && (
        <div className="rounded-lg border border-border/60 bg-card/50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <BookOpen className="h-3 w-3" />
            AI Explanation
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
        </div>
      )}

      {/* Learning path position */}
      {result.explanations.learning_path.includes(selectedFile) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
          #{result.explanations.learning_path.indexOf(selectedFile) + 1} in recommended learning path
        </div>
      )}
    </div>
  );
};
