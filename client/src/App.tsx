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
import Dashboard from "@/pages/dashboard";
import Plants from "@/pages/plants";
import CareSchedule from "@/pages/care-schedule";
import Guides from "@/pages/guides";
import Profile from "@/pages/profile";
import Tools from "@/pages/tools";
import LightMeterPage from "@/pages/light-meter";
import PlantIdentifierPage from "@/pages/tools/plant-identifier";
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
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <PlantProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </PlantProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
