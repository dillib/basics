import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Mail, CreditCard, Shield, LogOut, ExternalLink, Crown, Sparkles } from "lucide-react";
import type { User as UserType } from "@shared/schema";
import Footer from "@/components/Footer";

export default function AccountPage() {
  const [, setLocation] = useLocation();

  const { data: user, isLoading, isError } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: purchases = [] } = useQuery<{ id: number; topicId: number }[]>({
    queryKey: ['/api/user/purchases'],
    enabled: !!user,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleUpgrade = () => {
    setLocation("/pricing");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <Skeleton className="h-10 w-48" />
            <Card className="border-card-border">
              <CardContent className="p-8">
                <div className="flex items-center gap-6">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-card-border">
              <CardContent className="p-8">
                <Skeleton className="h-40 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-4" data-testid="text-signin-required">Sign in Required</h1>
            <p className="text-muted-foreground mb-8">
              Please sign in to view your account settings.
            </p>
            <Button onClick={() => window.location.href = "/api/login"} data-testid="button-signin">
              Sign In
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const getPlanBadge = () => {
    switch (user.plan) {
      case "pro":
        return (
          <Badge className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0" data-testid="badge-plan-pro">
            <Crown className="h-3 w-3 mr-1" />
            Pro
          </Badge>
        );
      case "pay_per_topic":
        return <Badge variant="secondary" data-testid="badge-plan-ppt">Pay Per Topic</Badge>;
      default:
        return <Badge variant="outline" data-testid="badge-plan-free">Free</Badge>;
    }
  };

  const topicsPurchased = Array.isArray(purchases) ? purchases.length : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold mb-8" data-testid="text-account-title">
            Account Settings
          </h1>

          <div className="space-y-6">
            <Card className="border-card-border" data-testid="card-profile">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your account information</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20" data-testid="avatar-user">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xl">
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold" data-testid="text-user-name">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.firstName || 'User'}
                    </h3>
                    <p className="text-muted-foreground flex items-center gap-2" data-testid="text-user-email">
                      <Mail className="h-4 w-4" />
                      {user.email}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border" data-testid="card-subscription">
              <CardHeader>
                <CardTitle>Subscription</CardTitle>
                <CardDescription>Your current plan and usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {user.plan === "pro" 
                          ? "Unlimited topic access" 
                          : user.plan === "pay_per_topic"
                          ? "Pay as you learn"
                          : "1 free topic included"}
                      </p>
                    </div>
                  </div>
                  {getPlanBadge()}
                </div>

                <Separator />

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50" data-testid="stat-topics-used">
                    <p className="text-sm text-muted-foreground mb-1">Topics Used</p>
                    <p className="text-2xl font-semibold" data-testid="text-topics-used">
                      {user.topicsUsed || 0}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50" data-testid="stat-topics-purchased">
                    <p className="text-sm text-muted-foreground mb-1">Topics Purchased</p>
                    <p className="text-2xl font-semibold" data-testid="text-topics-purchased">
                      {topicsPurchased}
                    </p>
                  </div>
                </div>

                {user.plan !== "pro" && (
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={handleUpgrade} className="flex-1" data-testid="button-upgrade">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Upgrade to Pro
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/pricing")} className="flex-1" data-testid="button-view-plans">
                      View All Plans
                    </Button>
                  </div>
                )}

                {user.plan === "pro" && (
                  <p className="text-sm text-muted-foreground" data-testid="text-pro-message">
                    You have unlimited access to all topics. Thank you for being a Pro member!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-card-border" data-testid="card-security">
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Account security and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Signed in with Replit
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-green-600 dark:text-green-400" data-testid="badge-secure">
                    Secure
                  </Badge>
                </div>

                <Separator />

                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto text-destructive hover:text-destructive"
                  onClick={handleLogout}
                  data-testid="button-signout"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            <Card className="border-card-border" data-testid="card-support">
              <CardHeader>
                <CardTitle>Help & Support</CardTitle>
                <CardDescription>Get help or manage your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Button variant="outline" asChild className="justify-start">
                    <a href="/help" data-testid="link-help-center">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Help Center
                    </a>
                  </Button>
                  <Button variant="outline" asChild className="justify-start">
                    <a href="/contact" data-testid="link-contact-support">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </a>
                  </Button>
                </div>

                <Separator />

                <div className="text-sm text-muted-foreground">
                  <p className="mb-2">Need to delete your account?</p>
                  <p>
                    Contact us at{" "}
                    <a href="mailto:support@basicstutor.com" className="text-primary hover:underline" data-testid="link-delete-email">
                      support@basicstutor.com
                    </a>{" "}
                    and we'll process your request within 30 days.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-card-border" data-testid="card-legal">
              <CardHeader>
                <CardTitle>Legal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <a href="/terms" className="text-sm text-primary hover:underline" data-testid="link-terms">
                    Terms of Service
                  </a>
                  <a href="/privacy" className="text-sm text-primary hover:underline" data-testid="link-privacy">
                    Privacy Policy
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
