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
import { CmsLayout } from "@/layouts/CmsLayout";

// Pages — lazy-loaded so each route is a separate chunk
const LoginPage            = lazy(() => import("./pages/LoginPage"));
const Index                = lazy(() => import("./pages/Index"));
const AboutPage            = lazy(() => import("./pages/AboutPage"));
const SubsidiariesPage     = lazy(() => import("./pages/SubsidiariesPage"));
const SubsidiaryDetailPage = lazy(() => import("./pages/SubsidiaryDetailPage"));
const ResourcesPage        = lazy(() => import("./pages/ResourcesPage"));
const NewsPage             = lazy(() => import("./pages/NewsPage"));
const NewsArticlePage      = lazy(() => import("./pages/NewsArticlePage"));
const LeadershipPage       = lazy(() => import("./pages/LeadershipPage"));
const LearningCentrePage   = lazy(() => import("./pages/LearningCentrePage"));
const AdminDashboard          = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersPage               = lazy(() => import("./pages/admin/UsersPage"));
const NewsManagePage          = lazy(() => import("./pages/admin/cms/NewsManagePage"));
const CoursesManagePage       = lazy(() => import("./pages/admin/cms/CoursesManagePage"));
const SessionsManagePage      = lazy(() => import("./pages/admin/cms/SessionsManagePage"));
const LearningPathsManagePage = lazy(() => import("./pages/admin/cms/LearningPathsManagePage"));
const CmsDashboard            = lazy(() => import("./pages/cms/CmsDashboard"));
const NotFound                = lazy(() => import("./pages/NotFound"));

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

/** CMS editor guard — allows users with canEditCms permission, in their own CmsLayout */
function CmsEditorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (!user.canEditCms) return <Navigate to="/" replace />;
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

              {/* Admin panel */}
              <Route
                element={
                  <AdminRoute>
                    <AdminLayout />
                  </AdminRoute>
                }
              >
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<UsersPage />} />
                <Route path="/admin/cms/news" element={<NewsManagePage />} />
                <Route path="/admin/cms/courses" element={<CoursesManagePage />} />
                <Route path="/admin/cms/sessions" element={<SessionsManagePage />} />
                <Route path="/admin/cms/learning-paths" element={<LearningPathsManagePage />} />
              </Route>

              {/* CMS editor panel — users with canEditCms permission */}
              <Route
                element={
                  <CmsEditorRoute>
                    <CmsLayout />
                  </CmsEditorRoute>
                }
              >
                <Route path="/cms" element={<CmsDashboard />} />
                <Route path="/cms/news" element={<NewsManagePage />} />
                <Route path="/cms/courses" element={<CoursesManagePage />} />
                <Route path="/cms/sessions" element={<SessionsManagePage />} />
                <Route path="/cms/learning-paths" element={<LearningPathsManagePage />} />
              </Route>

              {/* Hub — authenticated users */}
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
                <Route path="/news/:id" element={<NewsArticlePage />} />
                <Route path="/leadership" element={<LeadershipPage />} />
                <Route path="/resources" element={<ResourcesPage />} />
                <Route path="/learning" element={<LearningCentrePage />} />
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
