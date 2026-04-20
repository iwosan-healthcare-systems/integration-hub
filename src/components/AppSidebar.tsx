import { Home, Building2, Users, FolderOpen, Newspaper, Link } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import iwosanLogo from "@/assets/iwosan_logo.webp";

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
  { title: "Home", url: "/", icon: Home },
  { title: "About Iwosan", url: "/about", icon: Building2 },
  { title: "Subsidiaries", url: "/subsidiaries", icon: Link },
  { title: "Resources", url: "/resources", icon: FolderOpen },
  { title: "News & Updates", url: "/news", icon: Newspaper },
  { title: "Leadership", url: "/leadership", icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="bg-sidebar/95 border-r border-sidebar-border shadow-sm">
      <SidebarHeader className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img src={iwosanLogo} alt="Iwosan Healthcare" className="h-9 w-auto shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 font-sans uppercase text-[10px] tracking-widest mb-3">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.title} className="rounded-2xl">
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent/20 hover:text-foreground"
                      activeClassName="bg-sidebar-accent text-foreground font-semibold"
                    >
                      <item.icon className="h-4 w-4" />
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
          <p className="text-[10px] font-sans text-sidebar-foreground/40 tracking-wide">
            © {new Date().getFullYear()} Iwosan Healthcare Systems
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
