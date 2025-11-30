import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  BookOpen, 
  Trophy, 
  Clock, 
  Flame,
  Star,
  ChevronRight,
  Settings,
  CreditCard,
  Bell,
  LogOut
} from "lucide-react";

interface LearningStats {
  topicsCompleted: number;
  quizScore: number;
  streakDays: number;
  hoursLearned: number;
}

interface TopicProgress {
  id: string;
  title: string;
  category: string;
  progress: number;
  lastAccessed: string;
}

// todo: remove mock functionality
const mockStats: LearningStats = {
  topicsCompleted: 12,
  quizScore: 87,
  streakDays: 14,
  hoursLearned: 28,
};

// todo: remove mock functionality
const mockTopicsInProgress: TopicProgress[] = [
  {
    id: "1",
    title: "Quantum Mechanics",
    category: "Physics",
    progress: 65,
    lastAccessed: "2 hours ago",
  },
  {
    id: "2",
    title: "Machine Learning Basics",
    category: "Technology",
    progress: 40,
    lastAccessed: "Yesterday",
  },
  {
    id: "3",
    title: "Philosophy of Mind",
    category: "Philosophy",
    progress: 15,
    lastAccessed: "3 days ago",
  },
];

// todo: remove mock functionality
const mockCompletedTopics: TopicProgress[] = [
  {
    id: "4",
    title: "Starting a Business",
    category: "Business",
    progress: 100,
    lastAccessed: "1 week ago",
  },
  {
    id: "5",
    title: "Blockchain Technology",
    category: "Technology",
    progress: 100,
    lastAccessed: "2 weeks ago",
  },
];

interface DashboardProps {
  userName?: string;
  userEmail?: string;
  subscriptionTier?: "free" | "pro";
}

export default function Dashboard({ 
  userName = "Alex Johnson",
  userEmail = "alex@example.com", 
  subscriptionTier = "pro" 
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");

  const statCards = [
    {
      title: "Topics Completed",
      value: mockStats.topicsCompleted,
      icon: BookOpen,
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Average Quiz Score",
      value: `${mockStats.quizScore}%`,
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    },
    {
      title: "Learning Streak",
      value: `${mockStats.streakDays} days`,
      icon: Flame,
      color: "text-orange-500",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Hours Learned",
      value: mockStats.hoursLearned,
      icon: Clock,
      color: "text-green-500",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-64 shrink-0">
            <Card className="border-card-border sticky top-20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  <Avatar className="h-20 w-20 mb-4">
                    <AvatarImage src="" alt={userName} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {userName.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <h2 className="font-semibold" data-testid="text-user-name">{userName}</h2>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                  <Badge className="mt-2" variant={subscriptionTier === "pro" ? "default" : "secondary"}>
                    {subscriptionTier === "pro" ? "Pro Learner" : "Free Plan"}
                  </Badge>
                </div>

                <nav className="space-y-1">
                  {[
                    { icon: BookOpen, label: "Overview", value: "overview" },
                    { icon: Star, label: "My Topics", value: "topics" },
                    { icon: CreditCard, label: "Subscription", value: "subscription" },
                    { icon: Bell, label: "Notifications", value: "notifications" },
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
                    onClick={() => console.log("Logout clicked")}
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
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-dashboard-title">
                Welcome back, {userName.split(" ")[0]}!
              </h1>
              <p className="text-muted-foreground">
                Continue your learning journey. You're on a {mockStats.streakDays}-day streak!
              </p>
            </div>

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

            <Tabs defaultValue="in-progress" className="space-y-6">
              <TabsList>
                <TabsTrigger value="in-progress" data-testid="tab-in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed" data-testid="tab-completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="in-progress" className="space-y-4">
                {mockTopicsInProgress.map((topic) => (
                  <Card 
                    key={topic.id}
                    className="border-card-border hover-elevate cursor-pointer"
                    onClick={() => console.log("Navigate to topic:", topic.id)}
                    data-testid={`card-topic-progress-${topic.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">{topic.category}</Badge>
                            <span className="text-xs text-muted-foreground">{topic.lastAccessed}</span>
                          </div>
                          <h3 className="font-semibold truncate">{topic.title}</h3>
                          <div className="flex items-center gap-3 mt-2">
                            <Progress value={topic.progress} className="flex-1 h-2" />
                            <span className="text-sm font-medium text-muted-foreground">{topic.progress}%</span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <Button variant="outline" className="w-full" data-testid="button-explore-topics">
                  Explore More Topics
                </Button>
              </TabsContent>

              <TabsContent value="completed" className="space-y-4">
                {mockCompletedTopics.map((topic) => (
                  <Card 
                    key={topic.id}
                    className="border-card-border hover-elevate cursor-pointer"
                    onClick={() => console.log("Navigate to topic:", topic.id)}
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
                            <span className="text-xs text-muted-foreground">Completed {topic.lastAccessed}</span>
                          </div>
                          <h3 className="font-semibold truncate">{topic.title}</h3>
                        </div>
                        <Button variant="ghost" size="sm">
                          Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
    </div>
  );
}
