import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlantProvider } from "@/context/PlantContext";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layouts/MainLayout";
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import NetworkStatusIndicator from '@/components/error/NetworkStatusIndicator';
import Dashboard from "@/pages/dashboard";
import Plants from "@/pages/plants";
import CareSchedule from "@/pages/care-schedule";
import Guides from "@/pages/guides";
import Profile from "@/pages/profile";
import Tools from "@/pages/tools";
import LightMeterPage from "@/pages/light-meter";
import PlantIdentifierPage from "@/pages/tools/plant-identifier";
import PlantHealthDiagnosticPage from "@/pages/tools/plant-health-diagnostic";
import PersonalizedAdvicePage from "@/pages/tools/personalized-advice";
import SeasonalCarePage from "@/pages/tools/seasonal-care";
import PlantArrangementPage from "@/pages/tools/plant-arrangement";
import JournalGeneratorPage from "@/pages/tools/journal-generator";
import GrowthAnalyzerPage from "@/pages/tools/growth-analyzer";
import PlantExpertPage from "@/pages/tools/plant-expert";
import CareSchedulerPage from "@/pages/tools/care-scheduler";
import CommunityInsightsPage from "@/pages/tools/community-insights";
import HealthDiagnosisDemo from "@/pages/health-diagnosis-demo";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Auth page (public) */}
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <MainLayout>
            <Dashboard />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/plants">
        <ProtectedRoute>
          <MainLayout>
            <Plants />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/schedule">
        <ProtectedRoute>
          <MainLayout>
            <CareSchedule />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/guides">
        <ProtectedRoute>
          <MainLayout>
            <Guides />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools">
        <ProtectedRoute>
          <MainLayout>
            <Tools />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/light-meter">
        <ProtectedRoute>
          <MainLayout>
            <LightMeterPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/plant-identifier">
        <ProtectedRoute>
          <MainLayout>
            <PlantIdentifierPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/plant-health-diagnostic">
        <ProtectedRoute>
          <MainLayout>
            <PlantHealthDiagnosticPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/health-diagnosis-demo">
        <ProtectedRoute>
          <MainLayout>
            <HealthDiagnosisDemo />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/personalized-advice">
        <ProtectedRoute>
          <MainLayout>
            <PersonalizedAdvicePage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/seasonal-care">
        <ProtectedRoute>
          <MainLayout>
            <SeasonalCarePage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/plant-arrangement">
        <ProtectedRoute>
          <MainLayout>
            <PlantArrangementPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/journal-generator">
        <ProtectedRoute>
          <MainLayout>
            <JournalGeneratorPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/growth-analyzer">
        <ProtectedRoute>
          <MainLayout>
            <GrowthAnalyzerPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/plant-expert">
        <ProtectedRoute>
          <MainLayout>
            <PlantExpertPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/care-scheduler">
        <ProtectedRoute>
          <MainLayout>
            <CareSchedulerPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/tools/community-insights">
        <ProtectedRoute>
          <MainLayout>
            <CommunityInsightsPage />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <MainLayout>
            <Profile />
          </MainLayout>
        </ProtectedRoute>
      </Route>
      
      {/* Not found */}
      <Route>
        <ProtectedRoute>
          <MainLayout>
            <NotFound />
          </MainLayout>
        </ProtectedRoute>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <PlantProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
                <NetworkStatusIndicator />
              </TooltipProvider>
            </PlantProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
