import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
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
      <Route path="/topic/:id" component={TopicPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // todo: replace with actual auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    console.log("User logged in");
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    console.log("User logged out");
    setIsLoggedIn(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-background text-foreground">
            <Header 
              isLoggedIn={isLoggedIn} 
              onLogin={handleLogin} 
              onLogout={handleLogout} 
            />
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
