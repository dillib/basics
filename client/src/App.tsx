import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import HomePage from "@/pages/HomePage";
import TopicsPage from "@/pages/TopicsPage";
import TopicPage from "@/pages/TopicPage";
import DashboardPage from "@/pages/DashboardPage";
import PricingPage from "@/pages/PricingPage";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/topics" component={TopicsPage} />
      <Route path="/topic/:slug" component={TopicPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header 
        isLoggedIn={isAuthenticated} 
        onLogin={handleLogin} 
        onLogout={handleLogout}
        user={user}
        isLoading={isLoading}
      />
      <Router />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
