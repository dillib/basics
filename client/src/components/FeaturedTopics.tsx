import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Star } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  duration: string;
  rating: number;
}

// todo: remove mock functionality
const featuredTopics: Topic[] = [
  {
    id: "1",
    title: "Quantum Mechanics",
    description: "Understand particles, waves, and probability from absolute scratch.",
    category: "Physics",
    difficulty: "Intermediate",
    duration: "4 hours",
    rating: 4.9,
  },
  {
    id: "2",
    title: "Machine Learning",
    description: "Learn how computers discover patterns in data, step by step.",
    category: "Technology",
    difficulty: "Beginner",
    duration: "3 hours",
    rating: 4.8,
  },
  {
    id: "3",
    title: "Entrepreneurship",
    description: "From idea to first customer—the fundamentals of building a business.",
    category: "Business",
    difficulty: "Beginner",
    duration: "2.5 hours",
    rating: 4.7,
  },
  {
    id: "4",
    title: "Philosophy of Mind",
    description: "Explore consciousness and what it means to think.",
    category: "Philosophy",
    difficulty: "Advanced",
    duration: "5 hours",
    rating: 4.9,
  },
];

const difficultyColors = {
  Beginner: "text-emerald-600 dark:text-emerald-400",
  Intermediate: "text-amber-600 dark:text-amber-400",
  Advanced: "text-rose-600 dark:text-rose-400",
};

interface FeaturedTopicsProps {
  onTopicClick?: (topicId: string) => void;
}

export default function FeaturedTopics({ onTopicClick }: FeaturedTopicsProps) {
  return (
    <section className="py-32 sm:py-40 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-16"
        >
          <div>
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4" data-testid="text-featured-topics-title">
              Start exploring
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl">
              Dive into our most popular learning paths, curated for curious minds.
            </p>
          </div>
          <Button variant="outline" size="lg" className="rounded-full shrink-0" data-testid="button-view-all-topics">
            View all topics
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {featuredTopics.map((topic, index) => (
            <motion.article
              key={topic.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onClick={() => {
                console.log("Topic clicked:", topic.id);
                onTopicClick?.(topic.id);
              }}
              className="group cursor-pointer"
              data-testid={`card-topic-${topic.id}`}
            >
              <div className="relative bg-card rounded-3xl p-8 sm:p-10 border border-border/50 h-full transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">{topic.category}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className={`text-sm font-medium ${difficultyColors[topic.difficulty]}`}>
                      {topic.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{topic.rating}</span>
                  </div>
                </div>

                <h3 className="text-2xl sm:text-3xl font-semibold mb-3 group-hover:text-primary transition-colors">
                  {topic.title}
                </h3>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  {topic.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{topic.duration}</span>
                  </div>
                  <span className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    Start learning
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
