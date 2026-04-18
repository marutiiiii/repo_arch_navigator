import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FileTree } from "@/components/repo/FileTree";
import { GraphViewer } from "@/components/repo/GraphViewer";
import { FileDetailsCard } from "@/components/repo/FileDetailsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, ArrowLeft } from "lucide-react";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";

const RepositoryAnalysis = () => {
  const { result, setResult } = useRepoAnalysis();
  const [selectedFile, setSelectedFile] = useState<string | undefined>();
  const navigate = useNavigate();

  function handleReset() {
    setResult(null);
    navigate("/");
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Repository Analysis"
        description={
          result
            ? `${result.repo_url} — ${result.total_files} files, ${result.total_dependencies} dependencies`
            : "Explore files, visualize dependencies, and inspect each module."
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              New Repo
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(0)}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Re-scan
            </Button>
            {result && (
              <Button
                size="sm"
                className="bg-gradient-primary hover:opacity-90"
                onClick={() => {
                  const blob = new Blob([JSON.stringify(result, null, 2)], {
                    type: "application/json",
                  });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "analysis.json";
                  a.click();
                }}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left — File Tree */}
        <Card className="lg:col-span-3 border-border/60">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">File Tree</h3>
              <Badge variant="secondary" className="text-[10px]">
                {result ? `${result.total_files} files` : "structure"}
              </Badge>
            </div>
            <div className="max-h-[640px] overflow-y-auto pr-1">
              <FileTree onFileSelect={setSelectedFile} selectedFile={selectedFile} />
            </div>
          </CardContent>
        </Card>

        {/* Center — Graph */}
        <Card className="lg:col-span-6 border-border/60">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Dependency Graph</h3>
              <Badge variant="secondary" className="text-[10px]">
                {result
                  ? `${result.graph.nodes.length}n · ${result.graph.edges.length}e`
                  : "graph"}
              </Badge>
            </div>
            <GraphViewer />
          </CardContent>
        </Card>

        {/* Right — File Details */}
        <Card className="lg:col-span-3 border-border/60">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">File Details</h3>
              <Badge variant="secondary" className="text-[10px]">inspector</Badge>
            </div>
            <FileDetailsCard selectedFile={selectedFile} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepositoryAnalysis;
