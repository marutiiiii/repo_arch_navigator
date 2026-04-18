import {
  FileCode, Tag, Zap, Skull, ArrowRightLeft, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";

interface Props {
  selectedFile?: string;
}

export const FileDetailsCard = ({ selectedFile }: Props) => {
  const { result } = useRepoAnalysis();

  if (!result || !selectedFile) {
    return (
      <EmptyState
        icon={FileCode}
        title="Select a file to view details"
        description="Click a file in the tree to see its score, tag, and AI explanation."
      />
    );
  }

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

  const tagColor: Record<string, string> = {
    HIGH:   "bg-primary/20 text-primary border-primary/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    LOW:    "bg-muted text-muted-foreground border-border",
  };

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
