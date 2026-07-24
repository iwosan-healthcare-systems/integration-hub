import { useCallback } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopNavbar } from "@/components/TopNavbar";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ChangePasswordModal } from "@/components/ChangePasswordModal";
import { Footer } from "@/components/Footer";
import { ChatWidget } from "@/components/ChatWidget";
import { useAuth } from "@/contexts/AuthContext";
import { clearAzureSession } from "@/services/authService";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";

export function HubLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const showFooter = !/^\/subsidiaries\/.+/.test(pathname);

  const handleInactivityTimeout = useCallback(async () => {
    if (user?.authProvider === 'azure') await clearAzureSession();
    logout();
    navigate('/login');
    toast.info('You were logged out after 1 hour of inactivity.');
  }, [user, logout, navigate]);

  useInactivityLogout(handleInactivityTimeout, !!user);

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
            {showFooter && <Footer />}
          </main>
          <ChatWidget />
        </div>
      </div>
    </SidebarProvider>
  );
}
