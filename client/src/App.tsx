import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlantProvider } from "@/context/PlantContext";
import MainLayout from "@/components/layouts/MainLayout";
import Dashboard from "@/pages/dashboard";
import Plants from "@/pages/plants";
import CareSchedule from "@/pages/care-schedule";
import Guides from "@/pages/guides";
import Profile from "@/pages/profile";
import Tools from "@/pages/tools";
import LightMeterPage from "@/pages/light-meter";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <MainLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/plants" component={Plants} />
        <Route path="/schedule" component={CareSchedule} />
        <Route path="/guides" component={Guides} />
        <Route path="/tools" component={Tools} />
        <Route path="/tools/light-meter" component={LightMeterPage} />
        <Route path="/profile" component={Profile} />
        <Route component={NotFound} />
      </Switch>
    </MainLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlantProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </PlantProvider>
    </QueryClientProvider>
  );
}

export default App;
