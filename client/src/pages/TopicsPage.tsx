import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Plus, Loader2, Sparkles, Star, Users, Shield, FileText } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Topic, User } from "@shared/schema";
import Footer from "@/components/Footer";

const categories = ["All", "Physics", "Technology", "Business", "Philosophy", "Psychology", "Economics", "Biology", "Mathematics"];

type SourceFilter = "all" | "samples" | "community" | "mine";

const difficultyColors: Record<string, string> = {
  beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [location] = useLocation();
  const [newTopicTitle, setNewTopicTitle] = useState(() => {
    // Check if there's a topic parameter in the URL
    const params = new URLSearchParams(window.location.search);
    return params.get("topic") || "";
  });
  const [, setLocation] = useLocation();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const { data: topics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ['/api/topics'],
  });

  const generateTopicMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/topics/generate", { title });
      return response.json();
    },
    onSuccess: (newTopic) => {
      // Invalidate and refetch topic lists
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      // Pre-populate the topic cache so it's available immediately
      queryClient.setQueryData(['/api/topics', newTopic.slug], newTopic);
      setNewTopicTitle("");
      setLocation(`/topic/${newTopic.slug}`);
    },
  });

  const filteredTopics = topics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (topic.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesCategory = selectedCategory === "All" || topic.category === selectedCategory;
    
    // Filter by source
    if (sourceFilter === "samples") {
      if (!topic.isSample) return false;
    } else if (sourceFilter === "community") {
      if (topic.isSample || topic.userId === user?.id) return false;
    } else if (sourceFilter === "mine") {
      if (topic.userId !== user?.id) return false;
    }
    
    return matchesSearch && matchesCategory;
  });

  const formatTime = (minutes: number | null) => {
    if (!minutes) return "~30 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const handleGenerateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicTitle.trim()) {
      generateTopicMutation.mutate(newTopicTitle.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-center mb-4" data-testid="text-topics-title">
            Explore Topics
          </h1>
          <p className="text-lg text-muted-foreground text-center mb-8">
            Choose any topic and learn it from its fundamental building blocks.
          </p>

          <Card className="border-card-border mb-8">
            <CardContent className="p-6">
              <form onSubmit={handleGenerateTopic} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Learn a New Topic</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter any topic you want to learn, and our AI will break it down into first principles.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g., Quantum Computing, Game Theory, Stoic Philosophy..."
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="flex-1"
                    data-testid="input-new-topic"
                    disabled={generateTopicMutation.isPending}
                  />
                  <Button 
                    type="submit" 
                    disabled={!newTopicTitle.trim() || generateTopicMutation.isPending}
                    data-testid="button-generate-topic"
                  >
                    {generateTopicMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
                {generateTopicMutation.isError && (
                  <p className="text-sm text-destructive">
                    {(generateTopicMutation.error as any)?.message || "Failed to generate topic. Please try again."}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 text-base"
              data-testid="input-topics-search"
            />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">Filter by Source</p>
          <Tabs value={sourceFilter} onValueChange={(val) => setSourceFilter(val as SourceFilter)} className="w-full">
            <TabsList className="bg-transparent gap-2">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-source-all">
                All Topics
              </TabsTrigger>
              <TabsTrigger value="samples" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-source-samples">
                Sample Topics
              </TabsTrigger>
              <TabsTrigger value="community" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-source-community">
                <Users className="h-4 w-4 mr-2" />
                Community
              </TabsTrigger>
              {user && (
                <TabsTrigger value="mine" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground" data-testid="tab-source-mine">
                  <Star className="h-4 w-4 mr-2" />
                  My Topics
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-8">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent">
            {categories.map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-testid={`tab-category-${category.toLowerCase()}`}
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-card-border">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-24 mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {filteredTopics.map((topic) => (
              <Card
                key={topic.id}
                className="group hover-elevate cursor-pointer border-card-border"
                onClick={() => setLocation(`/topic/${topic.slug}`)}
                data-testid={`card-topic-${topic.slug}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {topic.category}
                      </Badge>
                      {topic.isSample && (
                        <Badge variant="outline" className="text-xs">Sample</Badge>
                      )}
                      {topic.userId === user?.id && (
                        <Badge variant="default" className="text-xs flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          Mine
                        </Badge>
                      )}
                    </div>
                    {topic.difficulty && (
                      <Badge className={`text-xs ${difficultyColors[topic.difficulty.toLowerCase()] || ""}`}>
                        {topic.difficulty}
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {topic.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(topic.estimatedMinutes)}</span>
                    </div>
                    <div className="flex items-center gap-1" title="Reference sheet available">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <span>Sheet</span>
                    </div>
                    {(topic as any).confidenceScore != null && (topic as any).validationData != null && (
                      <div className="flex items-center gap-1" title={`AI Confidence: ${(topic as any).confidenceScore}%`}>
                        {(topic as any).confidenceScore >= 90 ? (
                          <>
                            <Shield className="h-3.5 w-3.5 text-green-500" />
                            <span className="text-green-600 dark:text-green-400">Verified</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-blue-600 dark:text-blue-400">AI</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              {topics.length === 0 
                ? "No topics yet. Generate your first topic above!"
                : "No topics found matching your search."
              }
            </p>
            {topics.length > 0 && (
              <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
