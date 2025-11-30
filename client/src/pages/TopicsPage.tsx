import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Clock, Users, Star, Filter } from "lucide-react";
import Footer from "@/components/Footer";

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  learners: number;
  rating: number;
}

// todo: remove mock functionality
const allTopics: Topic[] = [
  {
    id: "quantum-mechanics",
    title: "Quantum Mechanics",
    description: "Understand the bizarre world of particles, waves, and probability from absolute scratch.",
    category: "Physics",
    difficulty: "Intermediate",
    duration: "4 hours",
    learners: 12400,
    rating: 4.9,
  },
  {
    id: "machine-learning",
    title: "Machine Learning Basics",
    description: "Learn how computers learn patterns from data, starting with simple math concepts.",
    category: "Technology",
    difficulty: "Beginner",
    duration: "3 hours",
    learners: 28900,
    rating: 4.8,
  },
  {
    id: "starting-a-business",
    title: "Starting a Business",
    description: "From idea validation to first customers—the fundamental principles of entrepreneurship.",
    category: "Business",
    difficulty: "Beginner",
    duration: "2.5 hours",
    learners: 45200,
    rating: 4.7,
  },
  {
    id: "philosophy-of-mind",
    title: "Philosophy of Mind",
    description: "Explore consciousness, free will, and what it means to think—from first principles.",
    category: "Philosophy",
    difficulty: "Advanced",
    duration: "5 hours",
    learners: 8700,
    rating: 4.9,
  },
  {
    id: "blockchain",
    title: "Blockchain Technology",
    description: "Demystify crypto and distributed systems by understanding their mathematical foundations.",
    category: "Technology",
    difficulty: "Intermediate",
    duration: "3.5 hours",
    learners: 19800,
    rating: 4.6,
  },
  {
    id: "cognitive-behavioral-therapy",
    title: "Cognitive Behavioral Therapy",
    description: "Learn the principles of CBT to understand thought patterns and emotional responses.",
    category: "Psychology",
    difficulty: "Beginner",
    duration: "2 hours",
    learners: 31500,
    rating: 4.8,
  },
  {
    id: "special-relativity",
    title: "Special Relativity",
    description: "Einstein's revolutionary theory explained from its core postulates.",
    category: "Physics",
    difficulty: "Advanced",
    duration: "4.5 hours",
    learners: 9200,
    rating: 4.9,
  },
  {
    id: "microeconomics",
    title: "Microeconomics Fundamentals",
    description: "Supply, demand, and market dynamics explained from first principles.",
    category: "Economics",
    difficulty: "Beginner",
    duration: "3 hours",
    learners: 22400,
    rating: 4.7,
  },
  {
    id: "evolutionary-biology",
    title: "Evolutionary Biology",
    description: "Understand natural selection and the origin of species from Darwin's original insights.",
    category: "Biology",
    difficulty: "Intermediate",
    duration: "3.5 hours",
    learners: 15600,
    rating: 4.8,
  },
];

const categories = ["All", "Physics", "Technology", "Business", "Philosophy", "Psychology", "Economics", "Biology"];

const difficultyColors = {
  Beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [, setLocation] = useLocation();

  const filteredTopics = allTopics.filter((topic) => {
    const matchesSearch = topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || topic.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTopics.map((topic) => (
            <Card
              key={topic.id}
              className="group hover-elevate cursor-pointer border-card-border"
              onClick={() => setLocation(`/topic/${topic.id}`)}
              data-testid={`card-topic-${topic.id}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <Badge variant="secondary" className="text-xs">
                    {topic.category}
                  </Badge>
                  <Badge className={`text-xs ${difficultyColors[topic.difficulty]}`}>
                    {topic.difficulty}
                  </Badge>
                </div>

                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {topic.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {topic.description}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{topic.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{topic.learners.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span>{topic.rating}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredTopics.length === 0 && (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">No topics found matching your search.</p>
            <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
