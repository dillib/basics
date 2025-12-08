import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Bug, Lightbulb, HelpCircle, Send, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import Footer from "@/components/Footer";
import type { SupportRequest } from "@shared/schema";

const supportSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  type: z.enum(["support", "bug", "feature", "feedback"], { required_error: "Please select a type" }),
  priority: z.enum(["low", "normal", "high", "critical"]).optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  description: z.string().min(20, "Please provide more details (at least 20 characters)"),
});

type SupportFormData = z.infer<typeof supportSchema>;

const requestTypes = [
  { value: "support", label: "Get Help", icon: HelpCircle, description: "Need assistance with the platform" },
  { value: "bug", label: "Report a Bug", icon: Bug, description: "Something isn't working correctly" },
  { value: "feature", label: "Feature Request", icon: Lightbulb, description: "Suggest a new feature or improvement" },
  { value: "feedback", label: "General Feedback", icon: MessageSquare, description: "Share your thoughts with us" },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  open: { label: "Open", variant: "default", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Loader2 },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  normal: { label: "Normal", className: "text-foreground" },
  high: { label: "High", className: "text-orange-600 dark:text-orange-400" },
  critical: { label: "Critical", className: "text-red-600 dark:text-red-400" },
};

export default function SupportPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();

  const form = useForm<SupportFormData>({
    resolver: zodResolver(supportSchema),
    defaultValues: {
      email: user?.email || "",
      type: undefined,
      priority: "normal",
      subject: "",
      description: "",
    },
  });

  const { data: myRequests, isLoading: requestsLoading } = useQuery<SupportRequest[]>({
    queryKey: ['/api/support/mine'],
    enabled: isAuthenticated,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: SupportFormData) => {
      return apiRequest('POST', '/api/support', data);
    },
    onSuccess: () => {
      setIsSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['/api/support/mine'] });
      toast({
        title: "Request submitted!",
        description: "We'll review your submission and get back to you soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to submit",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SupportFormData) => {
    submitMutation.mutate(data);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-lg mx-auto text-center">
            <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold mb-4" data-testid="text-support-success">
              Request Submitted!
            </h1>
            <p className="text-muted-foreground mb-8">
              Thank you for reaching out. Our team will review your submission and respond as soon as possible.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => { setIsSubmitted(false); form.reset(); }} variant="outline" data-testid="button-submit-another">
                Submit another request
              </Button>
              <Button onClick={() => window.location.href = "/"} data-testid="button-back-home">
                Back to Home
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-support-title">
              Support & Feedback
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Need help? Have a suggestion? We'd love to hear from you. Submit a request and we'll get back to you as soon as possible.
            </p>
          </div>

          <Tabs defaultValue="submit" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="submit" data-testid="tab-submit-request">Submit Request</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-request-history" disabled={!isAuthenticated}>
                My Requests {isAuthenticated && myRequests && myRequests.length > 0 && `(${myRequests.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="submit">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <Card className="border-card-border">
                    <CardHeader>
                      <CardTitle>Submit a Request</CardTitle>
                      <CardDescription>
                        Fill out the form below and we'll respond as soon as possible.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="your@email.com"
                                    {...field}
                                    data-testid="input-support-email"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Request Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-support-type">
                                      <SelectValue placeholder="Select a type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {requestTypes.map((type) => (
                                      <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                          <type.icon className="h-4 w-4" />
                                          <span>{type.label}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-support-priority">
                                      <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="low">Low - No rush</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High - Affecting my work</SelectItem>
                                    <SelectItem value="critical">Critical - Urgent issue</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                  <Input
                                    placeholder="Brief summary of your request"
                                    {...field}
                                    data-testid="input-support-subject"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Please provide as much detail as possible..."
                                    className="min-h-[150px]"
                                    {...field}
                                    data-testid="textarea-support-description"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            className="w-full"
                            disabled={submitMutation.isPending}
                            data-testid="button-submit-support"
                          >
                            {submitMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Submit Request
                              </>
                            )}
                          </Button>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-card-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Request Types</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {requestTypes.map((type) => (
                        <div key={type.value} className="flex items-start gap-3">
                          <div className="rounded-lg bg-muted p-2">
                            <type.icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="border-card-border">
                    <CardHeader>
                      <CardTitle className="text-lg">Response Times</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Critical</span>
                        <span className="font-medium">Within 4 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">High</span>
                        <span className="font-medium">Within 24 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Normal</span>
                        <span className="font-medium">Within 48 hours</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Low</span>
                        <span className="font-medium">Within 1 week</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle>My Support Requests</CardTitle>
                  <CardDescription>
                    View and track your submitted requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!isAuthenticated ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">Sign in to view your request history</p>
                      <Button onClick={() => window.location.href = "/api/login"} data-testid="button-login-to-view">
                        Sign In
                      </Button>
                    </div>
                  ) : requestsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : myRequests && myRequests.length > 0 ? (
                    <div className="space-y-4">
                      {myRequests.map((request) => {
                        const status = statusConfig[request.status || 'open'];
                        const priority = priorityConfig[request.priority || 'normal'];
                        return (
                          <div
                            key={request.id}
                            className="border rounded-lg p-4 hover-elevate cursor-pointer"
                            data-testid={`card-request-${request.id}`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                              <h3 className="font-medium">{request.subject}</h3>
                              <div className="flex items-center gap-2">
                                <Badge variant={status.variant} className="text-xs">
                                  {status.label}
                                </Badge>
                                <span className={`text-xs ${priority.className}`}>
                                  {priority.label}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                              {request.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span>Type: {request.type}</span>
                              <span>Submitted: {formatDate(request.createdAt)}</span>
                              {request.resolvedAt && (
                                <span>Resolved: {formatDate(request.resolvedAt)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">You haven't submitted any requests yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
}
