import { useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { useAuth } from "@/contexts/AuthContext";
import { clearAzureSession } from "@/services/authService";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export function HubLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleInactivityTimeout = useCallback(async () => {
    if (user?.authProvider === 'azure') await clearAzureSession();
    logout();
    navigate('/login');
    toast.info('You were logged out after 1 hour of inactivity.');
  }, [user, logout, navigate]);

  useInactivityLogout(handleInactivityTimeout, user?.authProvider === 'azure');

  return (
    <SidebarProvider>
      <ScrollToTop />
      <ChangePasswordModal />
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNavbar />
          <main id="main-scroll" className="flex-1 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
