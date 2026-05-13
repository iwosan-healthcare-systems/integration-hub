import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { HubLayout } from "@/layouts/HubLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AboutPage from "./pages/AboutPage";
import SubsidiariesPage from "./pages/SubsidiariesPage";
import ResourcesPage from "./pages/ResourcesPage";
import NewsPage from "./pages/NewsPage";
import LeadershipPage from "./pages/LeadershipPage";
import EmailPortalPage from "./pages/EmailPortalPage";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

/** Admin-only guard — redirects unauthenticated users to /login, non-admins to / */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

/** Hub guard — redirects unauthenticated to /login, admins to /admin */
function HubRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PageLoader />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Admin-only section */}
            <Route
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersPage />} />
            </Route>

            {/* Hub — authenticated non-admin users */}
            <Route
              element={
                <HubRoute>
                  <HubLayout />
                </HubRoute>
              }
            >
              <Route path="/" element={<Index />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/subsidiaries" element={<SubsidiariesPage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/leadership" element={<LeadershipPage />} />
              <Route path="/resources" element={<ResourcesPage />} />
              <Route path="/email-portal" element={<EmailPortalPage />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
