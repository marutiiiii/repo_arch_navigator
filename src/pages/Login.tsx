import { Github, Globe, Box } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BASE_URL = "http://127.0.0.1:5000";

const Login = () => {
  const handleGithubLogin = () => {
    window.location.href = `${BASE_URL}/auth/github/login`;
  };

  const handleGoogleLogin = () => {
    window.location.href = `${BASE_URL}/auth/google/login`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-grid-white/5 bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute left-1/2 top-1/2 -ml-[20%] -mt-[20%] h-[40%] w-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      
      <Card className="relative w-full max-w-md border-border/60 shadow-elegant overflow-hidden bg-card/60 backdrop-blur-xl">
        <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow mb-6">
            <Box className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-2">
            Welcome to RepoNav
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Analyze architectures, dependencies, and ask AI questions about your repositories.
          </p>

          <div className="w-full space-y-4">
            <Button 
              size="lg" 
              className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium"
              onClick={handleGithubLogin}
            >
              <Github className="mr-2 h-5 w-5" />
              Connect with GitHub
            </Button>

            <Button 
              size="lg" 
              variant="outline"
              className="w-full h-12 border-border/60 bg-card hover:bg-accent font-medium"
              onClick={handleGoogleLogin}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Login with Google
            </Button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            By authenticating, you allow RepoNav to fetch your public repositories for analysis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
