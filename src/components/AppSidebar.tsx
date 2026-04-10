import { Home, Building2, Users, FolderOpen, Newspaper, Link, ChevronDown } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainNav = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "About Iwosan", url: "/about", icon: Building2 },
  { title: "Subsidiaries", url: "/subsidiaries", icon: Link },
  { title: "Resources", url: "/resources", icon: FolderOpen },
  { title: "News & Updates", url: "/news", icon: Newspaper },
  { title: "Leadership", url: "/leadership", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center shrink-0">
            <span className="text-accent-foreground font-bold text-sm">IH</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="font-semibold text-sm text-sidebar-foreground">Innovation Hub</p>
              <p className="text-xs text-sidebar-foreground/60">Iwosan Healthcare</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!collapsed && (
          <p className="text-xs text-sidebar-foreground/40">© 2024 Iwosan Healthcare Systems</p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
