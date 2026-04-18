import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard.tsx";
import RepositoryAnalysis from "./pages/RepositoryAnalysis.tsx";
import Compatibility from "./pages/Compatibility.tsx";
import ChangeAnalyzer from "./pages/ChangeAnalyzer.tsx";
import AskCode from "./pages/AskCode.tsx";
import Settings from "./pages/Settings.tsx";
import NotFound from "./pages/NotFound.tsx";
import { RepoAnalysisProvider } from "./context/RepoAnalysisContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RepoAnalysisProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/repository" element={<RepositoryAnalysis />} />
              <Route path="/compatibility" element={<Compatibility />} />
              <Route path="/changes" element={<ChangeAnalyzer />} />
              <Route path="/ask" element={<AskCode />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </RepoAnalysisProvider>
  </QueryClientProvider>
);

export default App;
