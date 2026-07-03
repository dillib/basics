import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Mail, CreditCard, Shield, LogOut, ExternalLink, Crown, Sparkles, Share2, MessageSquare, Trash2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppConfig } from "@/hooks/useAppConfig";
import { apiRequest } from "@/lib/queryClient";
import type { User as UserType, TopicPurchase } from "@shared/schema";
import Footer from "@/components/Footer";

const featureRequestSchema = z.object({
  email: z.string().email(),
  subject: z.string().min(5),
  message: z.string().min(10),
});

export default function AccountPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showFeatureDialog, setShowFeatureDialog] = React.useState(false);
  const { monetizationEnabled } = useAppConfig();

  const { data: user, isLoading, isError } = useQuery<UserType>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: purchases = [] } = useQuery<TopicPurchase[]>({
    queryKey: ['/api/user/purchases'],
    enabled: !!user,
  });

  const form = useForm<z.infer<typeof featureRequestSchema>>({
    resolver: zodResolver(featureRequestSchema),
    defaultValues: {
      email: user?.email || '',
      subject: '',
      message: '',
    },
  });

  // There is no instant self-service delete endpoint (account deletion cascades
  // across topics, progress, purchases, etc. and deserves a human review, not a
  // fire-and-forget DB call). This submits a support request instead, matching
  // the policy already documented on the Help page: processed within 30 days.
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/support", {
        email: user?.email || "",
        type: "other",
        subject: "Account deletion request",
        description: `User ${user?.id || ""} (${user?.email || "unknown email"}) has requested permanent account deletion.`,
      });
      if (!response.ok) throw new Error("Failed to submit deletion request");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Deletion request received",
        description: "We'll process your request and confirm by email within 30 days.",
      });
      setShowDeleteDialog(false);
    },
    onError: () => toast({ title: "Error", description: "Failed to submit request. Please email support@basicstutor.com directly.", variant: "destructive" }),
  });

  const featureRequestMutation = useMutation({
    mutationFn: async (data: z.infer<typeof featureRequestSchema>) => {
      const response = await apiRequest("POST", "/api/support", {
        email: data.email,
        type: "feature",
        subject: data.subject,
        description: data.message,
      });
      if (!response.ok) throw new Error("Failed to submit request");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Feature request submitted!" });
      setShowFeatureDialog(false);
      form.reset();
    },
    onError: () => toast({ title: "Error", description: "Failed to submit request", variant: "destructive" }),
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleUpgrade = () => {
    setLocation("/pricing");
  };

  const handleShare = async () => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "BasicsTutor.com",
          text: "Learn any topic by breaking it down into first principles with AI",
          url,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Referral link copied to clipboard" });
    }
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
                        {!monetizationEnabled
                          ? "Full access — everything is free during early access"
                          : user.plan === "pro"
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
                      {monetizationEnabled ? "Upgrade to Pro" : "Join Pro Waitlist"}
                    </Button>
                    <Button variant="outline" onClick={() => setLocation("/pricing")} className="flex-1" data-testid="button-view-plans">
                      {monetizationEnabled ? "View All Plans" : "Learn More"}
                    </Button>
                  </div>
                )}

                {user.plan === "pro" && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground" data-testid="text-pro-message">
                      You have unlimited access to all topics. Thank you for being a Pro member!
                    </p>
                    {user.proExpiresAt && (
                      <div className="flex items-center gap-2 text-sm" data-testid="pro-expiration">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Pro access expires: {new Date(user.proExpiresAt).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                    )}
                  </div>
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
                        Signed in with Google
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button variant="outline" onClick={handleShare} data-testid="button-share-refer">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share & Refer
                  </Button>
                  <Button variant="outline" onClick={() => setShowFeatureDialog(true)} data-testid="button-feature-request">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Feature Request
                  </Button>
                </div>

                <Separator />

                <Button 
                  variant="destructive" 
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="button-delete-account"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              This submits a deletion request to our support team. Once processed, your
              account and all associated data will be permanently deleted — this cannot
              be undone. We'll confirm by email within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Submitting..." : "Request Deletion"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showFeatureDialog} onOpenChange={setShowFeatureDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Feature Request</DialogTitle>
            <DialogDescription>
              Tell us what feature you'd like to see in BasicsTutor
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => featureRequestMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="your@email.com" {...field} data-testid="input-feature-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Feature title" {...field} data-testid="input-feature-subject" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your feature request..." {...field} data-testid="textarea-feature-message" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={featureRequestMutation.isPending} data-testid="button-submit-feature">
                {featureRequestMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
