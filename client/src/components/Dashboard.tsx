import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Flame,
  Star,
  ChevronRight,
  Settings,
  CreditCard,
  LogOut,
  Sparkles,
  BarChart3,
  RotateCcw
} from "lucide-react";
import AnalyticsPanel from "./AnalyticsPanel";
import ReviewPanel from "./ReviewPanel";
import type { Topic, Progress as ProgressType, User } from "@shared/schema";

interface DashboardProps {
  user?: User;
  onLogout?: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();

  const { data: topics = [], isLoading: topicsLoading } = useQuery<Topic[]>({
    queryKey: ['/api/user/topics'],
  });

  const { data: progressList = [], isLoading: progressLoading } = useQuery<ProgressType[]>({
    queryKey: ['/api/user/progress'],
  });

  const userName = user?.firstName 
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email?.split('@')[0] || 'Learner';

  const inProgressTopics = progressList.filter(p => p.completedAt === null);
  const completedTopics = progressList.filter(p => p.completedAt !== null);
  
  const stats = {
    topicsCompleted: completedTopics.length,
    topicsInProgress: inProgressTopics.length,
    totalTopics: topics.length,
    bestScore: Math.max(...progressList.map(p => p.bestScore || 0), 0),
  };

  const statCards = [
    {
      title: "Topics Started",
      value: stats.totalTopics,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Completed",
      value: stats.topicsCompleted,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      title: "In Progress",
      value: stats.topicsInProgress,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Best Quiz Score",
      value: `${stats.bestScore}%`,
      icon: Star,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  const isLoading = topicsLoading || progressLoading;

  const getTopicById = (topicId: string) => topics.find(t => t.id === topicId);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <Card className="border-card-border sticky top-20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src={user?.profileImageUrl || ""} alt={userName} style={{ objectFit: 'cover' }} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {userName.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="font-semibold" data-testid="text-user-name">{userName}</h2>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Badge className="mt-2" variant={user?.plan === "pro" ? "default" : "secondary"}>
                    {user?.plan === "pro" ? "Pro Learner" : "Free Plan"}
                  </Badge>
                </div>

                <nav className="space-y-1">
                  {[
                    { icon: BookOpen, label: "Overview", value: "overview" },
                    { icon: BarChart3, label: "Analytics", value: "analytics" },
                    { icon: RotateCcw, label: "Review", value: "review" },
                    { icon: Star, label: "My Topics", value: "topics" },
                    { icon: CreditCard, label: "Subscription", value: "subscription" },
                    { icon: Settings, label: "Settings", value: "settings" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setActiveTab(item.value)}
                      className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors hover-elevate ${
                        activeTab === item.value
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                      data-testid={`button-nav-${item.value}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  ))}
                  <button
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover-elevate"
                    onClick={onLogout}
                    data-testid="button-logout"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </nav>
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1">
            {activeTab === "analytics" ? (
              <AnalyticsPanel />
            ) : activeTab === "review" ? (
              <ReviewPanel />
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-dashboard-title">
                    Welcome back, {userName.split(" ")[0]}!
                  </h1>
                  <p className="text-muted-foreground">
                    {stats.topicsCompleted > 0 
                      ? `You've completed ${stats.topicsCompleted} topic${stats.topicsCompleted > 1 ? 's' : ''}. Keep learning!`
                      : "Start your learning journey by exploring topics."}
                  </p>
                </div>

            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((stat) => (
                  <Card key={stat.title} className="border-card-border" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
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
            )}

            <Tabs defaultValue="in-progress" className="space-y-6">
              <TabsList>
                <TabsTrigger value="in-progress" data-testid="tab-in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="in-progress" className="space-y-4">
                {isLoading ? (
                  [1, 2, 3].map((i) => (
                    <Card key={i} className="border-card-border">
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : inProgressTopics.length === 0 ? (
                  <Card className="border-card-border">
                    <CardContent className="p-8 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">Start Learning</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Browse topics and start your first principles learning journey.
                      </p>
                      <Button onClick={() => setLocation('/topics')} data-testid="button-explore-topics">
                        Explore Topics
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  inProgressTopics.map((progress) => {
                    const topic = getTopicById(progress.topicId);
                    if (!topic) return null;
                    const total = progress.totalPrinciples || 0;
                    const completed = progress.principlesCompleted || 0;
                    const progressPercent = total > 0
                      ? Math.round((completed / total) * 100)
                      : 0;

                    return (
                      <Card 
                        key={progress.id}
                        className="border-card-border hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/topic/${topic.slug}`)}
                        data-testid={`card-topic-progress-${topic.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">{topic.category}</Badge>
                              </div>
                              <h3 className="font-semibold truncate">{topic.title}</h3>
                              <div className="flex items-center gap-3 mt-2">
                                <Progress value={progressPercent} className="flex-1 h-2" />
                                <span className="text-sm font-medium text-muted-foreground">{progressPercent}%</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-5 w-5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}

                {inProgressTopics.length > 0 && (
                  <Button variant="outline" className="w-full" onClick={() => setLocation('/topics')} data-testid="button-explore-more">
                    Explore More Topics
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {isLoading ? (
                  [1, 2].map((i) => (
                    <Card key={i} className="border-card-border">
                      <CardContent className="p-4">
                        <Skeleton className="h-6 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : completedTopics.length === 0 ? (
                  <Card className="border-card-border">
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">
                        Complete a topic quiz to see it here!
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  completedTopics.map((progress) => {
                    const topic = getTopicById(progress.topicId);
                    if (!topic) return null;

                    return (
                      <Card 
                        key={progress.id}
                        className="border-card-border hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/topic/${topic.slug}`)}
                        data-testid={`card-topic-completed-${topic.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                              <Trophy className="h-5 w-5 text-green-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">{topic.category}</Badge>
                                {progress.bestScore && (
                                  <span className="text-xs text-muted-foreground">
                                    Best score: {progress.bestScore}%
                                  </span>
                                )}
                              </div>
                              <h3 className="font-semibold truncate">{topic.title}</h3>
                            </div>
                            <Button variant="ghost" size="sm">
                              Review
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
