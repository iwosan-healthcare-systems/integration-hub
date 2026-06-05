import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { NavigationProgress } from "@/components/NavigationProgress";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Layouts — small, load eagerly so route wrappers are ready immediately
import { HubLayout } from "@/layouts/HubLayout";
import { AdminLayout } from "@/layouts/AdminLayout";

// Pages — lazy-loaded so each route is a separate chunk
const LoginPage        = lazy(() => import("./pages/LoginPage"));
const Index            = lazy(() => import("./pages/Index"));
const AboutPage        = lazy(() => import("./pages/AboutPage"));
const SubsidiariesPage     = lazy(() => import("./pages/SubsidiariesPage"));
const SubsidiaryDetailPage = lazy(() => import("./pages/SubsidiaryDetailPage"));
const ResourcesPage    = lazy(() => import("./pages/ResourcesPage"));
const NewsPage         = lazy(() => import("./pages/NewsPage"));
const LeadershipPage   = lazy(() => import("./pages/LeadershipPage"));
const AdminDashboard   = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersPage        = lazy(() => import("./pages/admin/UsersPage"));
const NotFound         = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}

/** Admin/Manager guard — redirects unauthenticated users to /login, regular users to / */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (user.role !== "admin" && user.role !== "manager") return <Navigate to="/" replace />;
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
        <NavigationProgress />
        <AuthProvider>
          <Suspense fallback={<Spinner />}>
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
                <Route path="/subsidiaries/:slug" element={<SubsidiaryDetailPage />} />
                <Route path="/news" element={<NewsPage />} />
                <Route path="/leadership" element={<LeadershipPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
