import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Lightbulb, 
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  Clock,
  BookmarkPlus,
  Share2,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Lock,
  CreditCard
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Topic, Principle, Progress as ProgressType } from "@shared/schema";
import Quiz from "./Quiz";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface TopicLearningPageProps {
  topicId?: string;
}

interface TopicAccess {
  canAccess: boolean;
  reason: string;
}

export default function TopicLearningPage({ topicId: slug }: TopicLearningPageProps) {
  const [expandedPrinciples, setExpandedPrinciples] = useState<Set<string>>(new Set());
  const [completedPrinciples, setCompletedPrinciples] = useState<Set<string>>(new Set());
  const [showQuiz, setShowQuiz] = useState(false);
  const [progressInitialized, setProgressInitialized] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: topic, isLoading: topicLoading, error: topicError } = useQuery<Topic>({
    queryKey: ['/api/topics', slug],
    enabled: !!slug,
  });

  const { data: principles = [], isLoading: principlesLoading } = useQuery<Principle[]>({
    queryKey: ['/api/topics', topic?.id, 'principles'],
    enabled: !!topic?.id,
  });

  const { data: userProgress } = useQuery<ProgressType[]>({
    queryKey: ['/api/user/progress'],
    enabled: isAuthenticated,
  });

  const { data: accessInfo, isLoading: accessLoading } = useQuery<TopicAccess>({
    queryKey: ['/api/user/can-access-topic', topic?.id],
    enabled: !!topic?.id && isAuthenticated,
  });

  // Check if topic is a sample topic (free for everyone) - use property from topic response
  const isSampleTopic = (topic as any)?.isSample === true;

  const purchaseTopicMutation = useMutation({
    mutationFn: async () => {
      if (!topic?.id) throw new Error("Topic not found");
      const response = await apiRequest("POST", `/api/checkout/topic/${topic.id}`);
      if (response.status === 401) {
        throw new Error("Please log in to purchase this topic");
      }
      if (response.status === 403) {
        throw new Error("You don't have permission to purchase this topic");
      }
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start checkout");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      if (error.message === "Please log in to purchase this topic") {
        window.location.href = "/api/login";
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  // Initialize completed principles from saved progress
  useEffect(() => {
    if (!topic?.id || principles.length === 0 || !isAuthenticated) return;
    
    const topicProgress = userProgress?.find(p => p.topicId === topic.id);
    if (topicProgress) {
      const completedCount = topicProgress.principlesCompleted || 0;
      if (completedCount > 0) {
        // Mark the first N principles as completed based on saved progress
        const completedIds = principles.slice(0, completedCount).map(p => p.id);
        setCompletedPrinciples(new Set(completedIds));
      }
    }
    setProgressInitialized(true);
  }, [topic?.id, principles, userProgress, isAuthenticated]);

  const updateProgressMutation = useMutation({
    mutationFn: async ({ principlesCompleted, totalPrinciples }: { principlesCompleted: number; totalPrinciples: number }) => {
      if (!topic?.id) return;
      const response = await apiRequest("POST", `/api/progress/${topic.id}`, {
        principlesCompleted,
        totalPrinciples,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/progress'] });
    },
  });

  const togglePrinciple = (id: string) => {
    setExpandedPrinciples((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markComplete = (id: string) => {
    const newCompleted = new Set(Array.from(completedPrinciples).concat(id));
    setCompletedPrinciples(newCompleted);
    
    if (principles.length > 0) {
      updateProgressMutation.mutate({
        principlesCompleted: newCompleted.size,
        totalPrinciples: principles.length,
      });
    }
  };

  const calculatedProgress = principles.length > 0 
    ? Math.round((completedPrinciples.size / principles.length) * 100)
    : 0;

  if (topicLoading || principlesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between gap-4 h-14">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-6 w-32" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl space-y-8">
            <div>
              <Skeleton className="h-10 w-3/4 mb-4" />
              <Skeleton className="h-6 w-full mb-4" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (topicError || !topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Topic Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The topic you're looking for doesn't exist or hasn't been generated yet.
            </p>
            <Button onClick={() => window.history.back()} data-testid="button-go-back">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sample topics are always fully accessible
  // For non-sample topics: check if user has access (Pro, purchased, or created)
  const hasFullAccess = isSampleTopic || 
    (!isAuthenticated ? false : accessLoading ? false : accessInfo?.canAccess === true);
  
  // For non-sample topics, show lock on principles 3+ if user doesn't have full access
  const canAccessAllPrinciples = isSampleTopic || hasFullAccess;

  const handlePurchase = () => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    purchaseTopicMutation.mutate();
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="shrink-0">{topic.category}</Badge>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium truncate">{topic.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formatTime(topic.estimatedMinutes || 30)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={calculatedProgress} className="w-24 h-2" />
                <span className="text-sm font-medium" data-testid="text-progress">{calculatedProgress}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" data-testid="button-bookmark">
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-share">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1 max-w-3xl">
            <div className="mb-8">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold" data-testid="text-topic-title">{topic.title}</h1>
                {isSampleTopic ? (
                  <Badge variant="default" className="bg-green-600 text-white" data-testid="badge-free">
                    Free
                  </Badge>
                ) : !canAccessAllPrinciples && (
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={handlePurchase}
                    disabled={purchaseTopicMutation.isPending}
                    className="ml-2"
                    data-testid="button-unlock-topic-header"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Unlock - $1.99
                  </Button>
                )}
              </div>
              <p className="text-lg text-muted-foreground mb-4">{topic.description}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Badge>{topic.difficulty}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatTime(topic.estimatedMinutes || 30)} to complete</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span>AI-generated content</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">First Principles</h2>
              </div>

              {principles.length === 0 ? (
                <Card className="border-card-border">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No principles available for this topic yet.</p>
                  </CardContent>
                </Card>
              ) : (
                principles.map((principle, index) => {
                  const isExpanded = expandedPrinciples.has(principle.id);
                  const isComplete = completedPrinciples.has(principle.id);
                  // Sample topics: all principles free. Non-sample: first 2 free
                  const isFreePreview = isSampleTopic || index < 2;
                  const isLocked = !isFreePreview && !canAccessAllPrinciples;

                  return (
                    <Card 
                      key={principle.id}
                      className={`border-card-border transition-all ${isComplete ? "border-l-4 border-l-primary" : ""} ${isLocked ? "opacity-60" : ""}`}
                      data-testid={`card-principle-${index + 1}`}
                    >
                      <CardHeader 
                        className={`${isLocked ? "cursor-not-allowed" : "cursor-pointer"}`}
                        onClick={() => !isLocked && togglePrinciple(principle.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isComplete ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : isLocked ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <span className="text-sm font-bold">{index + 1}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg flex items-center gap-2">
                              {principle.title}
                              {isLocked && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  <Lock className="h-3 w-3 mr-1" />
                                  Locked
                                </Badge>
                              )}
                              {!isSampleTopic && index < 2 && !isLocked && (
                                <Badge variant="default" className="ml-2 text-xs bg-green-600">
                                  Free
                                </Badge>
                              )}
                            </CardTitle>
                          </div>
                          {isExpanded && !isLocked ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </CardHeader>
                      
                      {isExpanded && !isLocked && (
                        <CardContent className="pt-0 space-y-6">
                          <div className="pl-12">
                            <p className="text-muted-foreground leading-relaxed mb-4 whitespace-pre-line">
                              {principle.explanation}
                            </p>
                            
                            {principle.analogy && (
                              <div className="bg-accent/50 rounded-lg p-4 border border-accent mb-4">
                                <div className="flex items-start gap-2">
                                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium mb-1">Real-World Analogy</p>
                                    <p className="text-sm text-muted-foreground">{principle.analogy}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {principle.keyTakeaways && principle.keyTakeaways.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-sm font-medium">Key Takeaways</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {principle.keyTakeaways.map((takeaway, i) => (
                                    <li key={i} className="text-sm text-muted-foreground">{takeaway}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {!isComplete && (
                            <div className="pl-12">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markComplete(principle.id);
                                }}
                                data-testid={`button-complete-${index + 1}`}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Mark as Understood
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      )}

                      {isLocked && isExpanded && (
                        <CardContent className="pt-0">
                          <div className="pl-12 py-4">
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <Lock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="font-semibold text-sm mb-2">
                                    {isAuthenticated ? "Unlock This Topic" : "Sign in to Continue Learning"}
                                  </p>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    {isAuthenticated 
                                      ? "Get access to all principles and the interactive quiz for this topic."
                                      : "Create a free account to unlock this topic or get unlimited access with Pro."
                                    }
                                  </p>
                                  {isAuthenticated ? (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Button 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePurchase();
                                        }}
                                        disabled={purchaseTopicMutation.isPending}
                                        data-testid="button-unlock-topic"
                                      >
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Unlock for $1.99
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.location.href = "/pricing";
                                        }}
                                        data-testid="button-unlock-pro"
                                      >
                                        Get Pro - Unlimited Topics
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <Button 
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Store the current topic URL to redirect back after login
                                          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                                          window.location.href = "/api/login";
                                        }}
                                        data-testid="button-signin-unlock"
                                      >
                                        Sign In to Unlock
                                      </Button>
                                      <Button 
                                        size="sm"
                                        variant="outline"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                                          window.location.href = "/pricing";
                                        }}
                                        data-testid="button-view-pricing"
                                      >
                                        View Pricing
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Test Your Understanding</h2>
                </div>
              </div>
              
              {/* Quiz is free for sample topics, locked for non-sample topics without access */}
              {canAccessAllPrinciples ? (
                showQuiz ? (
                  <Quiz 
                    topicId={topic.id}
                    topicTitle={topic.title}
                    onComplete={() => setShowQuiz(false)} 
                  />
                ) : (
                  <Card className="border-card-border">
                    <CardContent className="p-8 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                        <BookOpen className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Ready to test your knowledge?</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                        Answer interactive questions to reinforce what you've learned about the first principles.
                      </p>
                      <Button 
                        onClick={() => setShowQuiz(true)} 
                        disabled={principles.length === 0}
                        data-testid="button-start-quiz"
                      >
                        Start Quiz
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              ) : (
                <Card className="border-card-border">
                  <CardContent className="p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                      <Lock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Quiz Locked</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      {isAuthenticated 
                        ? "Unlock this topic to access the interactive quiz and test your understanding."
                        : "Sign in and unlock this topic to access the quiz."
                      }
                    </p>
                    {isAuthenticated ? (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={handlePurchase}
                          disabled={purchaseTopicMutation.isPending}
                          data-testid="button-unlock-quiz"
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Unlock for $1.99
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => window.location.href = "/pricing"}
                          data-testid="button-quiz-pro"
                        >
                          Get Pro - Unlimited Topics
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button 
                          onClick={() => {
                            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                            window.location.href = "/api/login";
                          }}
                          data-testid="button-signin-quiz"
                        >
                          Sign In to Unlock
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => {
                            sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
                            window.location.href = "/pricing";
                          }}
                          data-testid="button-quiz-pricing"
                        >
                          View Pricing
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </main>

          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <nav className="space-y-2">
                      {principles.map((principle, index) => {
                        const isComplete = completedPrinciples.has(principle.id);
                        const isFreePreview = isSampleTopic || index < 2;
                        const isLocked = !isFreePreview && !canAccessAllPrinciples;
                        return (
                          <button
                            key={principle.id}
                            onClick={() => {
                              if (!isLocked) {
                                setExpandedPrinciples((prev) => new Set(Array.from(prev).concat(principle.id)));
                              }
                            }}
                            disabled={isLocked}
                            className={`flex items-center gap-2 w-full text-left text-sm p-2 rounded-md ${
                              isLocked ? "opacity-50 cursor-not-allowed" : "hover-elevate"
                            } ${
                              isComplete ? "text-primary" : "text-muted-foreground"
                            }`}
                            data-testid={`toc-principle-${index + 1}`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : isLocked ? (
                              <Lock className="h-4 w-4 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-current shrink-0" />
                            )}
                            <span className="truncate">{principle.title}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
