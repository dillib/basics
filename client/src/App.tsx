import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import HomePage from "@/pages/HomePage";
const TopicsPage = lazy(() => import("@/pages/TopicsPage"));
const TopicPage = lazy(() => import("@/pages/TopicPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const CheckoutSuccessPage = lazy(() => import("@/pages/CheckoutSuccessPage"));
const CheckoutCancelPage = lazy(() => import("@/pages/CheckoutCancelPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));
const TermsPage = lazy(() => import("@/pages/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/PrivacyPage"));
const AccountPage = lazy(() => import("@/pages/AccountPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const SupportPage = lazy(() => import("@/pages/SupportPage"));
const WhyPage = lazy(() => import("@/pages/WhyPage"));
import NotFound from "@/pages/not-found";

// Home stays in the main bundle (the most common landing page); every other
// page loads its own chunk on first visit, so a first-time visitor no longer
// downloads the dashboard, admin, charts and PDF tools up front.
function Router() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/topics" component={TopicsPage} />
      <Route path="/topic/:slug" component={TopicPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/checkout/success" component={CheckoutSuccessPage} />
      <Route path="/checkout/cancel" component={CheckoutCancelPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/help" component={HelpPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/account" component={AccountPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/support" component={SupportPage} />
      <Route path="/why" component={WhyPage} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function AppContent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);

  // Handle redirect after login
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const redirectPath = sessionStorage.getItem('redirectAfterLogin');
      if (redirectPath) {
        sessionStorage.removeItem('redirectAfterLogin');
        setLocation(redirectPath);
      }
    }
  }, [isAuthenticated, isLoading, setLocation]);

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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <AppContent />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
