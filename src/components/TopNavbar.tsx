import { Bell, Search, Menu } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import iwosanLogo from "@/assets/iwosan-logo.png";

export function TopNavbar() {
  return (
    <header className="h-16 flex items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden md:block h-6 w-px bg-border" />
        <span className="hidden md:block font-sans text-sm text-muted-foreground">
          Iwosan Innovation Hub
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent rounded-full" />
        </Button>
        <div className="ml-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs font-sans font-semibold text-primary-foreground">IW</span>
        </div>
      </div>
    </header>
  );
}
