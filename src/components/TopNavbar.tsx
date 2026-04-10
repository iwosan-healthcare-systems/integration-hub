import { Bell, Search, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TopNavbar() {
  return (
    <header className="h-14 flex items-center justify-between border-b bg-card px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hub..."
            className="border-0 bg-transparent h-7 w-48 focus-visible:ring-0 text-sm placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
