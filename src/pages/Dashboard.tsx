import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Github, Sparkles, FolderTree, AlertCircle, CheckCircle2, Loader2, GitFork, Book
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import { Input } from "@/components/ui/input";
import { analyzeRepo } from "@/lib/api";
import { useRepoAnalysis } from "@/context/RepoAnalysisContext";
import { useAuth, Repo } from "@/context/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

const Dashboard = () => {
  const navigate = useNavigate();
  const { result, setResult, isLoading, setIsLoading, error, setError } = useRepoAnalysis();
  const { logged_in, profile, repos, loading: authLoading } = useAuth();
  const [url, setUrl] = useState("");
  
  useEffect(() => {
    if (!authLoading && !logged_in) {
      navigate("/login");
    }
  }, [authLoading, logged_in, navigate]);

  async function handleAnalyze(repoUrl: string) {
    if (!repoUrl.trim()) return;
    setError(null);
    setIsLoading(true);
    try {
      const data = await analyzeRepo(repoUrl.trim());
      setResult(data);
      navigate("/repository");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading || !logged_in) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <SectionHeader
        title={`Welcome back, ${profile?.name?.split(" ")[0] || profile?.username || "Developer"} 👋`}
        description="Select a repository from your GitHub profile to analyze its architecture and compatibility."
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive max-w-2xl">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Github className="h-5 w-5" /> Your Repositories
            </h3>
            <Badge variant="secondary" className="text-xs">
              {repos.length} Repos
            </Badge>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row mb-2">
            <div className="relative flex-1">
              <Github className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze(url)}
                placeholder="Or manually paste a public GitHub URL to analyze..."
                className="h-11 pl-10 bg-card/60 backdrop-blur"
                disabled={isLoading}
              />
            </div>
            <Button
              size="lg"
              className="h-11 bg-primary hover:bg-primary/90 min-w-[160px]"
              onClick={() => handleAnalyze(url)}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing</>
              ) : (
                <>Analyze Repo <ArrowRight className="ml-1.5 h-4 w-4" /></>
              )}
            </Button>
          </div>

          {!repos || repos.length === 0 ? (
            <Card className="border-border/60 shadow-sm bg-card/50 h-[300px] flex items-center justify-center">
              <EmptyState
                icon={Book}
                title="No repositories found"
                description="Your connected account doesn't have any public repositories."
              />
            </Card>
          ) : (
            <ScrollArea className="h-[600px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {repos.map((repo: Repo) => (
                  <Card 
                    key={repo.full_name} 
                    className="group relative overflow-hidden border-border/60 hover:border-primary/40 transition-all cursor-pointer bg-card/60 hover:bg-card/90"
                    onClick={() => handleAnalyze(repo.html_url)}
                  >
                    <CardContent className="p-5">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground truncate pr-4">
                          <Book className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">{repo.name}</span>
                        </div>
                        {repo.language && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {repo.language}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 h-8 mb-4">
                        {repo.description || "No description provided."}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <GitFork className="h-3 w-3" /> Updated {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-xs font-medium text-primary group-hover:bg-primary/10 -mr-2"
                          disabled={isLoading}
                        >
                          Analyze <ArrowRight className="ml-1 h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </div>
                      
                      {isLoading && (
                        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                            <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                            <span className="text-xs font-semibold">Analyzing...</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/60 overflow-hidden shadow-elegant bg-gradient-card">
            <div className="relative p-6">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              
              <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                Quick Stats
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Parsed Files</p>
                  <p className="text-2xl font-bold text-foreground">{result ? result.total_files : "0"}</p>
                </div>
                <div className="bg-card/50 rounded-lg p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mapped Dependencies</p>
                  <p className="text-2xl font-bold text-foreground">{result ? result.total_dependencies : "0"}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" /> Current Analysis
              </h3>
              {!result ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click on one of your repositories to generate a full architectural analysis, dependency graph, and compatibility report.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Analyzing <b>{result.repo_url.split("/").slice(-2).join("/")}</b></span>
                  </div>
                  
                  <Button 
                    className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20" 
                    variant="outline"
                    onClick={() => navigate("/repository")}
                  >
                    View active graph
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
