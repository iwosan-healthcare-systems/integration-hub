import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/PageLoader";
import { HubLayout } from "@/layouts/HubLayout";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import AboutPage from "./pages/AboutPage";
import SubsidiariesPage from "./pages/SubsidiariesPage";
import ResourcesPage from "./pages/ResourcesPage";
import NewsPage from "./pages/NewsPage";
import LeadershipPage from "./pages/LeadershipPage";
import EmailPortalPage from "./pages/EmailPortalPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <PageLoader />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <HubLayout />
                </ProtectedRoute>
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
