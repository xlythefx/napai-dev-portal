import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ConfirmHost } from "@/components/ui/confirm-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import Index from "./pages/Index";
import Gallery from "./pages/Gallery";
import Auth from "./pages/Auth";
import DeveloperPortal from "./pages/DeveloperPortal";
import DeveloperSignup from "./pages/DeveloperSignup";
import Tools from "./pages/Tools";
import FinanceApp from "./pages/tools/FinanceApp";
import RAGChatbot from "./pages/tools/RAGChatbot";
import TikTokAffiliate from "./pages/tools/TikTokAffiliate";
import ProjectManagementTool from "./pages/tools/ProjectManagementTool";
import AIAccountingTool from "./pages/tools/AIAccountingTool";
import ContentShortsCreator from "./pages/tools/ContentShortsCreator";
import PromptEnhancer from "./pages/tools/PromptEnhancer";
import ProfessionalParaphraser from "./pages/tools/ProfessionalParaphraser";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFiles from "./pages/admin/AdminFiles";
import AdminDevelopers from "./pages/admin/AdminDevelopers";
import AdminTimeTracker from "./pages/admin/AdminTimeTracker";
import AdminTimeTrackerSession from "./pages/admin/AdminTimeTrackerSession";
import AdminTimeTrackerPayments from "./pages/admin/AdminTimeTrackerPayments";
import AdminTimeTrackerScreenshots from "./pages/admin/AdminTimeTrackerScreenshots";
import AdminTimeTrackerSettings from "./pages/admin/AdminTimeTrackerSettings";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminFinance from "./pages/admin/AdminFinance";
import TabletDashboard from "./pages/admin/TabletDashboard";
import TabletKeys from "./pages/admin/TabletKeys";
import TabletKeyDetail from "./pages/admin/TabletKeyDetail";
import TabletDevices from "./pages/admin/TabletDevices";
import TabletProvisioning from "./pages/admin/TabletProvisioning";
import TabletApkVersions from "./pages/admin/TabletApkVersions";
import VendotabLanding from "./pages/products/Vendotab";
import VendotabTrial from "./pages/products/VendotabTrial";
import TimeTracker from "./pages/tools/TimeTracker";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ConfirmHost />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/products/quantab" element={<VendotabLanding />} />
          <Route path="/products/quantab/trial" element={<VendotabTrial />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/developer-portal" element={<DeveloperPortal />} />
          <Route path="/developer-signup" element={<DeveloperSignup />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="files" element={<AdminFiles />} />
            <Route path="developers" element={<AdminDevelopers />} />
            <Route path="time-tracker" element={<AdminTimeTracker />} />
            <Route path="time-tracker/payments" element={<AdminTimeTrackerPayments />} />
            <Route path="time-tracker/screenshots" element={<AdminTimeTrackerScreenshots />} />
            <Route path="time-tracker/settings" element={<AdminTimeTrackerSettings />} />
            <Route path="time-tracker/sessions/:sessionId" element={<AdminTimeTrackerSession />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="finance" element={<AdminFinance />} />
            <Route path="tablet" element={<TabletDashboard />} />
            <Route path="tablet/keys" element={<TabletKeys />} />
            <Route path="tablet/keys/:id" element={<TabletKeyDetail />} />
            <Route path="tablet/devices" element={<TabletDevices />} />
            <Route path="tablet/provisioning" element={<TabletProvisioning />} />
            <Route path="tablet/apk-versions" element={<TabletApkVersions />} />
          </Route>
          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <Tools />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/project-management"
            element={
              <ProtectedRoute>
                <ProjectManagementTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/ai-accounting"
            element={
              <ProtectedRoute>
                <AIAccountingTool />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/finance"
            element={
              <ProtectedRoute>
                <FinanceApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/prompt-enhancer"
            element={
              <ProtectedRoute>
                <PromptEnhancer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/professional-paraphraser"
            element={
              <ProtectedRoute>
                <ProfessionalParaphraser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/rag"
            element={
              <ProtectedRoute>
                <RAGChatbot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/content-shorts"
            element={
              <ProtectedRoute>
                <ContentShortsCreator />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/tiktok-affiliate"
            element={
              <ProtectedRoute>
                <TikTokAffiliate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/time-tracker"
            element={
              <ProtectedRoute>
                <TimeTracker />
              </ProtectedRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
