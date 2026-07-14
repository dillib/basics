import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Clock, Plus, Loader2, Sparkles, Star, Shield, FileText } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Topic, User } from "@shared/schema";
import Footer from "@/components/Footer";
import GenerationProgress from "@/components/GenerationProgress";
import { canonicalCategory, CANONICAL_ORDER } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { LEVELS, LEVEL_LABELS, type Level } from "@shared/levels";

type SourceFilter = "all" | "samples" | "mine";

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
  const [jobId, setJobId] = useState<string | null>(null);
  const [genLevel, setGenLevel] = useState<Level>('adult');

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

  // Everything except the category filter (search + source). Category counts and
  // the filtered grid both derive from this, so the counts always match what a
  // pill will actually show — and they update live as you search.
  const searchAndSource = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return topics.filter((topic) => {
      const matchesSearch =
        topic.title.toLowerCase().includes(q) ||
        (topic.description?.toLowerCase().includes(q) ?? false);
      if (!matchesSearch) return false;
      if (sourceFilter === "samples" && !topic.isSample) return false;
      if (sourceFilter === "mine" && topic.userId !== user?.id) return false;
      return true;
    });
  }, [topics, searchQuery, sourceFilter, user?.id]);

  // Gemini assigns free-form categories that fragment into dozens of
  // near-duplicates ("Biology & Health", "Biology & Medicine", ...). Collapse
  // them into a small set of canonical fields (see lib/categories), show only
  // the ones that actually have topics, each with a live count.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of searchAndSource) {
      const c = canonicalCategory(t.category);
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const present = CANONICAL_ORDER.filter((c) => counts.has(c));
    return [
      { name: "All", count: searchAndSource.length },
      ...present.map((name) => ({ name, count: counts.get(name)! })),
    ];
  }, [searchAndSource]);

  const generateTopicMutation = useMutation({
    mutationFn: async ({ title, level }: { title: string; level: Level }) => {
      const response = await apiRequest("POST", "/api/topics/generate", { title, level });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Failed to generate topic");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Existing topics resolve immediately; new topics return a background
      // job id that GenerationProgress polls until the content is ready.
      if (data.existing && data.topic?.slug) {
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        setNewTopicTitle("");
        setLocation(`/topic/${data.topic.slug}`);
      } else if (data.jobId) {
        setJobId(data.jobId);
      }
    },
  });

  const handleGenerationComplete = (result: { slug: string }) => {
    queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
    setJobId(null);
    setNewTopicTitle("");
    setLocation(`/topic/${result.slug}`);
  };

  const handleGenerationError = () => {
    setJobId(null);
  };

  const filteredTopics = useMemo(
    () =>
      searchAndSource.filter(
        (topic) =>
          selectedCategory === "All" ||
          canonicalCategory(topic.category) === selectedCategory
      ),
    [searchAndSource, selectedCategory]
  );

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
      generateTopicMutation.mutate({ title: newTopicTitle.trim(), level: genLevel });
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
                <div className="mb-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase">Explain it for</p>
                  <div className="inline-grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
                    {LEVELS.map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setGenLevel(lv)}
                        disabled={generateTopicMutation.isPending || !!jobId}
                        className={cn(
                          "rounded-md px-4 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                          genLevel === lv
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        data-testid={`button-genlevel-${lv}`}
                      >
                        {LEVEL_LABELS[lv]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    type="text"
                    placeholder="e.g., Quantum Computing, Game Theory, Stoic Philosophy..."
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="flex-1"
                    data-testid="input-new-topic"
                    disabled={generateTopicMutation.isPending || !!jobId}
                  />
                  <Button
                    type="submit"
                    disabled={!newTopicTitle.trim() || generateTopicMutation.isPending || !!jobId}
                    className="sm:w-auto w-full"
                    data-testid="button-generate-topic"
                  >
                    {generateTopicMutation.isPending || jobId ? (
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
                
                <GenerationProgress
                  isGenerating={generateTopicMutation.isPending || !!jobId}
                  jobId={jobId}
                  topicTitle={newTopicTitle}
                  onComplete={handleGenerationComplete}
                  onError={handleGenerationError}
                />
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
          <p className="text-sm font-medium text-muted-foreground mb-3">Filter by field</p>
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
            {categories.map((category) => (
              <TabsTrigger
                key={category.name}
                value={category.name}
                className="group rounded-full border border-foreground/10 bg-muted/40 px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow-sm"
                data-testid={`tab-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {category.name}
                <span className="ml-2 text-xs opacity-60 group-data-[state=active]:opacity-80">
                  {category.count}
                </span>
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
                className="card-hover group cursor-pointer border-card-border"
                onClick={() => setLocation(`/topic/${topic.slug}`)}
                data-testid={`card-topic-${topic.slug}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {canonicalCategory(topic.category)}
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
                            <span className="text-blue-600 dark:text-blue-400">AI Crafted</span>
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
