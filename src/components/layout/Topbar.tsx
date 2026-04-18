import { Bell, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Topbar = () => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

      <div className="relative ml-1 hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search repositories, files, dependencies..."
          className="h-10 pl-9 bg-muted/50 border-transparent focus-visible:bg-card focus-visible:border-border"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
          <span className="sr-only">Notifications</span>
        </Button>
        <div className="ml-1 flex items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-3 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
            DV
          </div>
          <div className="hidden text-xs leading-tight sm:block">
            <p className="font-semibold text-foreground">Dev User</p>
            <p className="text-muted-foreground">Workspace</p>
          </div>
        </div>
      </div>
    </header>
  );
};
