import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { 
  BarChart3, 
  Brain, 
  Target, 
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  BookOpen
} from "lucide-react";

interface AnalyticsOverview {
  totalQuizzes: number;
  averageScore: number;
  totalTimeSpent: number;
  topicsStudied: number;
  principlesMastered: number;
  weakPrinciplesCount: number;
  recentQuizzes: number;
  topicsWithProgress: number;
}

interface WeakPrinciple {
  id: string;
  principleId: string;
  topicId: string;
  masteryScore: number;
  timesReviewed: number;
  timesCorrect: number;
  principleTitle: string;
  topicTitle: string;
  topicSlug: string;
}

export default function AnalyticsPanel() {
  const [, setLocation] = useLocation();

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsOverview>({
    queryKey: ['/api/analytics/overview'],
  });

  const { data: weakPrinciples = [], isLoading: weakLoading } = useQuery<WeakPrinciple[]>({
    queryKey: ['/api/analytics/weak-principles'],
  });

  const isLoading = analyticsLoading || weakLoading;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const statCards = [
    {
      title: "Quizzes Taken",
      value: analytics?.totalQuizzes || 0,
      icon: BarChart3,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Average Score",
      value: `${analytics?.averageScore || 0}%`,
      icon: Target,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Principles Mastered",
      value: analytics?.principlesMastered || 0,
      icon: CheckCircle,
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Time Learning",
      value: formatTime(analytics?.totalTimeSpent || 0),
      icon: Clock,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-card-border">
              <CardContent className="p-4">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="border-card-border">
          <CardContent className="p-6">
            <Skeleton className="h-48" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" data-testid="text-analytics-title">Learning Analytics</h2>
        <p className="text-muted-foreground text-sm">Track your progress and identify areas for improvement.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-card-border" data-testid={`card-analytics-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bgColor} mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Mastery Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Mastered Principles</span>
                  <span className="font-medium text-green-500">{analytics?.principlesMastered || 0}</span>
                </div>
                <Progress 
                  value={analytics?.principlesMastered && analytics?.weakPrinciplesCount 
                    ? (analytics.principlesMastered / (analytics.principlesMastered + analytics.weakPrinciplesCount)) * 100 
                    : 0} 
                  className="h-2" 
                />
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Needs Review</span>
                  <span className="font-medium text-orange-500">{analytics?.weakPrinciplesCount || 0}</span>
                </div>
                <Progress 
                  value={analytics?.weakPrinciplesCount && analytics?.principlesMastered 
                    ? (analytics.weakPrinciplesCount / (analytics.principlesMastered + analytics.weakPrinciplesCount)) * 100 
                    : 0} 
                  className="h-2 [&>div]:bg-orange-500" 
                />
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Topics Studied</span>
                  <span className="font-medium">{analytics?.topicsStudied || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Recent Quizzes (7 days)</span>
                  <span className="font-medium">{analytics?.recentQuizzes || 0}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-card-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Areas for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weakPrinciples.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Great job! No weak areas detected.</p>
                <p className="text-xs text-muted-foreground mt-1">Keep taking quizzes to track mastery.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {weakPrinciples.slice(0, 4).map((wp) => (
                  <div 
                    key={wp.id}
                    className="flex items-center justify-between p-2 rounded-lg hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/topic/${wp.topicSlug}`)}
                    data-testid={`card-weak-principle-${wp.principleId}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{wp.principleTitle}</p>
                      <p className="text-xs text-muted-foreground truncate">{wp.topicTitle}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Progress value={wp.masteryScore} className="w-16 h-2 [&>div]:bg-orange-500" />
                      <Badge variant="outline" className="text-xs shrink-0">
                        {wp.masteryScore}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Topics in Progress</span>
              </div>
              <p className="text-2xl font-bold">{analytics?.topicsWithProgress || 0}</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Quiz Accuracy</span>
              </div>
              <p className="text-2xl font-bold">{analytics?.averageScore || 0}%</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Mastery Rate</span>
              </div>
              <p className="text-2xl font-bold">
                {analytics?.principlesMastered && (analytics.principlesMastered + (analytics?.weakPrinciplesCount || 0)) > 0
                  ? Math.round((analytics.principlesMastered / (analytics.principlesMastered + (analytics?.weakPrinciplesCount || 0))) * 100)
                  : 0}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
