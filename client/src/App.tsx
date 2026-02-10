import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/Dashboard";
import Agents from "@/pages/Agents";
import PhoneNumbers from "@/pages/PhoneNumbers";
import Knowledgebase from "@/pages/Knowledgebase";
import Calls from "@/pages/Calls";
import Batches from "@/pages/Batches";
import Executions from "@/pages/Executions";
import Settings from "@/pages/Settings";
import AdminUsers from "@/pages/AdminUsers";
import VoiceLab from "@/pages/VoiceLab";
import Workspace from "@/pages/Workspace";
import LoginPage from "@/pages/LoginPage";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

function Router() {
  const { user, isSuperAdmin, isLoading, tenant, isImpersonating } = useAuth();
  const [location, setLocation] = useLocation();

  console.log('Router state:', { user: !!user, isSuperAdmin, isLoading });

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  // If a tenant-prefixed route is used, ensure it matches the logged-in tenant unless super-admin
  const match = location.match(/^\/t\/([^\/]+)/);
  if (match && user && tenant && !isSuperAdmin && !isImpersonating) {
    const slugInUrl = match[1];
    if (slugInUrl !== tenant.slug) {
      // Redirect to the correct tenant path
      setLocation('/');
    }
  }

  if (!user) {
    console.log('No user, showing login page');
    return <LoginPage />;
  }

  if (isSuperAdmin) {
    console.log('Super admin detected, showing dashboard');
    return <SuperAdminDashboard />;
  }

  console.log('Regular user, showing tenant dashboard');
  return (
    <Switch>
      {/* Default tenant routes */}
      <Route path="/" component={Dashboard} />
      <Route path="/agents" component={Agents} />
      <Route path="/phone-numbers" component={PhoneNumbers} />
      <Route path="/knowledgebase" component={Knowledgebase} />
      <Route path="/voice-lab" component={VoiceLab} />
      <Route path="/calls" component={Calls} />
      <Route path="/batches" component={Batches} />
      <Route path="/executions" component={Executions} />
      <Route path="/agent-executions/:agentId/:batchId" component={Executions} />
      <Route path="/workspace" component={Workspace} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin-users" component={AdminUsers} />

      {/* Tenant-prefixed routes for deep links: /t/:slug/... */}
      <Route path="/t/:slug" component={Dashboard} />
      <Route path="/t/:slug/agents" component={Agents} />
      <Route path="/t/:slug/phone-numbers" component={PhoneNumbers} />
      <Route path="/t/:slug/knowledgebase" component={Knowledgebase} />
      <Route path="/t/:slug/voice-lab" component={VoiceLab} />
      <Route path="/t/:slug/calls" component={Calls} />
      <Route path="/t/:slug/batches" component={Batches} />
      <Route path="/t/:slug/executions" component={Executions} />
      <Route path="/t/:slug/agent-executions/:agentId/:batchId" component={Executions} />
      <Route path="/t/:slug/workspace" component={Workspace} />
      <Route path="/t/:slug/settings" component={Settings} />
      <Route path="/t/:slug/admin-users" component={AdminUsers} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
