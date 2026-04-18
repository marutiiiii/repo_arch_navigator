import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FileTree } from "@/components/repo/FileTree";
import { GraphViewer } from "@/components/repo/GraphViewer";
import { FileDetailsCard } from "@/components/repo/FileDetailsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

const RepositoryAnalysis = () => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Repository Analysis"
        description="Explore files, visualize dependencies, and inspect each module."
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Re-scan
            </Button>
            <Button size="sm" className="bg-gradient-primary hover:opacity-90">
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left — File Tree */}
        <Card className="lg:col-span-3 border-border/60">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">File Tree</h3>
              <Badge variant="secondary" className="text-[10px]">structure</Badge>
            </div>
            <div className="max-h-[640px] overflow-y-auto pr-1">
              <FileTree />
            </div>
          </CardContent>
        </Card>

        {/* Center — Graph */}
        <Card className="lg:col-span-6 border-border/60">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Dependency Graph</h3>
              <Badge variant="secondary" className="text-[10px]">graph</Badge>
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
            <FileDetailsCard />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RepositoryAnalysis;
