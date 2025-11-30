import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, Star, ArrowRight } from "lucide-react";

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
const featuredTopics: Topic[] = [
  {
    id: "1",
    title: "Quantum Mechanics",
    description: "Understand the bizarre world of particles, waves, and probability from absolute scratch.",
    category: "Physics",
    difficulty: "Intermediate",
    duration: "4 hours",
    learners: 12400,
    rating: 4.9,
  },
  {
    id: "2",
    title: "Machine Learning Basics",
    description: "Learn how computers learn patterns from data, starting with simple math concepts.",
    category: "Technology",
    difficulty: "Beginner",
    duration: "3 hours",
    learners: 28900,
    rating: 4.8,
  },
  {
    id: "3",
    title: "Starting a Business",
    description: "From idea validation to first customers—the fundamental principles of entrepreneurship.",
    category: "Business",
    difficulty: "Beginner",
    duration: "2.5 hours",
    learners: 45200,
    rating: 4.7,
  },
  {
    id: "4",
    title: "Philosophy of Mind",
    description: "Explore consciousness, free will, and what it means to think—from first principles.",
    category: "Philosophy",
    difficulty: "Advanced",
    duration: "5 hours",
    learners: 8700,
    rating: 4.9,
  },
  {
    id: "5",
    title: "Blockchain Technology",
    description: "Demystify crypto and distributed systems by understanding their mathematical foundations.",
    category: "Technology",
    difficulty: "Intermediate",
    duration: "3.5 hours",
    learners: 19800,
    rating: 4.6,
  },
  {
    id: "6",
    title: "Cognitive Behavioral Therapy",
    description: "Learn the principles of CBT to understand thought patterns and emotional responses.",
    category: "Psychology",
    difficulty: "Beginner",
    duration: "2 hours",
    learners: 31500,
    rating: 4.8,
  },
];

const difficultyColors = {
  Beginner: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Intermediate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Advanced: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface FeaturedTopicsProps {
  onTopicClick?: (topicId: string) => void;
}

export default function FeaturedTopics({ onTopicClick }: FeaturedTopicsProps) {
  const handleTopicClick = (topicId: string) => {
    console.log("Topic clicked:", topicId);
    onTopicClick?.(topicId);
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-2" data-testid="text-featured-topics-title">
              Popular Learning Paths
            </h2>
            <p className="text-muted-foreground">
              Start with our most loved topics, curated by the community.
            </p>
          </div>
          <Button variant="outline" data-testid="button-view-all-topics">
            View All Topics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTopics.map((topic) => (
            <Card 
              key={topic.id}
              className="group hover-elevate cursor-pointer border-card-border"
              onClick={() => handleTopicClick(topic.id)}
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
                    <span>{topic.learners.toLocaleString()} learners</span>
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
      </div>
    </section>
  );
}
