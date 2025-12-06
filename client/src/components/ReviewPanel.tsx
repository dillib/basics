import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Brain, 
  RotateCcw, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  Lightbulb,
  Clock,
  Star
} from "lucide-react";

interface ReviewStats {
  dueCount: number;
  totalTracked: number;
  averageMastery: number;
  masteredCount: number;
}

interface ReviewItem {
  id: string;
  userId: string;
  principleId: string;
  topicId: string;
  dueAt: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  status: string;
  principle: {
    id: string;
    title: string;
    explanation: string;
    analogy: string | null;
    keyTakeaways: string[] | null;
  } | null;
  topic: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export default function ReviewPanel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<ReviewStats>({
    queryKey: ['/api/reviews/stats'],
  });

  const { data: dueReviews = [], isLoading: reviewsLoading } = useQuery<ReviewItem[]>({
    queryKey: ['/api/reviews/due'],
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ reviewId, quality }: { reviewId: string; quality: number }) => {
      const response = await apiRequest('POST', `/api/reviews/${reviewId}/grade`, { quality });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.message,
        description: `Next review in ${data.nextReviewIn} day${data.nextReviewIn > 1 ? 's' : ''}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/due'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/overview'] });
      setShowAnswer(false);
      if (currentIndex >= dueReviews.length - 1) {
        setCurrentIndex(0);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = statsLoading || reviewsLoading;
  const currentReview = dueReviews[currentIndex];

  const handleGrade = (quality: number) => {
    if (currentReview) {
      gradeMutation.mutate({ reviewId: currentReview.id, quality });
    }
  };

  const qualityButtons = [
    { quality: 0, label: "Again", color: "bg-red-500 hover:bg-red-600", description: "Completely forgot" },
    { quality: 3, label: "Hard", color: "bg-orange-500 hover:bg-orange-600", description: "Recalled with difficulty" },
    { quality: 4, label: "Good", color: "bg-blue-500 hover:bg-blue-600", description: "Recalled correctly" },
    { quality: 5, label: "Easy", color: "bg-green-500 hover:bg-green-600", description: "Perfect recall" },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-card-border">
          <CardContent className="p-8">
            <Skeleton className="h-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" data-testid="text-review-title">Spaced Repetition</h2>
        <p className="text-muted-foreground text-sm">Review principles at optimal intervals for long-term retention.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-card-border" data-testid="card-due-reviews">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30 mb-3">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-2xl font-bold">{stats?.dueCount || 0}</p>
            <p className="text-xs text-muted-foreground">Due for Review</p>
          </CardContent>
        </Card>

        <Card className="border-card-border" data-testid="card-total-tracked">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 mb-3">
              <Brain className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats?.totalTracked || 0}</p>
            <p className="text-xs text-muted-foreground">Total Tracked</p>
          </CardContent>
        </Card>

        <Card className="border-card-border" data-testid="card-average-mastery">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30 mb-3">
              <Star className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats?.averageMastery || 0}%</p>
            <p className="text-xs text-muted-foreground">Avg. Mastery</p>
          </CardContent>
        </Card>

        <Card className="border-card-border" data-testid="card-mastered-count">
          <CardContent className="p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 mb-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats?.masteredCount || 0}</p>
            <p className="text-xs text-muted-foreground">Mastered</p>
          </CardContent>
        </Card>
      </div>

      {dueReviews.length === 0 ? (
        <Card className="border-card-border">
          <CardContent className="p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No reviews due right now. Take some quizzes to build your review queue, or come back later when more reviews are scheduled.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-primary" />
                Review Card {currentIndex + 1} of {dueReviews.length}
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {currentReview?.topic?.title}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="min-h-[200px]">
              <div className="mb-4">
                <h3 className="text-lg font-semibold" data-testid="text-review-principle-title">
                  {currentReview?.principle?.title}
                </h3>
              </div>

              {!showAnswer ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-6">Can you recall this principle?</p>
                  <Button 
                    size="lg" 
                    onClick={() => setShowAnswer(true)}
                    data-testid="button-show-answer"
                  >
                    Show Answer
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm leading-relaxed" data-testid="text-review-explanation">
                      {currentReview?.principle?.explanation}
                    </p>
                  </div>

                  {currentReview?.principle?.analogy && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">Analogy</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {currentReview.principle.analogy}
                      </p>
                    </div>
                  )}

                  {currentReview?.principle?.keyTakeaways && currentReview.principle.keyTakeaways.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Key Takeaways:</p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {currentReview.principle.keyTakeaways.map((takeaway, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                            <span>{takeaway}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {showAnswer && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground text-center mb-4">How well did you remember?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {qualityButtons.map((btn) => (
                    <Button
                      key={btn.quality}
                      className={`${btn.color} text-white flex-col h-auto py-3`}
                      onClick={() => handleGrade(btn.quality)}
                      disabled={gradeMutation.isPending}
                      data-testid={`button-grade-${btn.label.toLowerCase()}`}
                    >
                      <span className="font-medium">{btn.label}</span>
                      <span className="text-xs opacity-80">{btn.description}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
                data-testid="button-previous-review"
              >
                Previous
              </Button>
              <Progress 
                value={((currentIndex + 1) / dueReviews.length) * 100} 
                className="w-32 h-2" 
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAnswer(false);
                  setCurrentIndex((prev) => Math.min(dueReviews.length - 1, prev + 1));
                }}
                disabled={currentIndex === dueReviews.length - 1}
                data-testid="button-next-review"
              >
                Skip
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
