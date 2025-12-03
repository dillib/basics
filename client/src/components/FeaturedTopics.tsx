import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, Clock, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Topic } from "@shared/schema";
import { Link } from "wouter";

const difficultyColors = {
  beginner: "text-emerald-600 dark:text-emerald-400",
  intermediate: "text-amber-600 dark:text-amber-400",
  advanced: "text-rose-600 dark:text-rose-400",
};

interface FeaturedTopicsProps {
  onTopicClick?: (topicSlug: string) => void;
}

const formatTime = (minutes: number | null) => {
  if (!minutes) return "30 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export default function FeaturedTopics({ onTopicClick }: FeaturedTopicsProps) {
  const { data: sampleTopics = [], isLoading } = useQuery<Topic[]>({
    queryKey: ['/api/sample-topics'],
  });

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
              Explore free sample topics
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl">
              Dive into these fully available topics to see how first principles learning works.
            </p>
          </div>
          <Link href="/topics">
            <Button variant="outline" size="lg" className="rounded-full shrink-0" data-testid="button-view-all-topics">
              Browse all topics
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card rounded-3xl p-8 sm:p-10 border border-border/50">
                <Skeleton className="h-4 w-24 mb-6" />
                <Skeleton className="h-8 w-3/4 mb-3" />
                <Skeleton className="h-16 w-full mb-6" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : sampleTopics.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No sample topics available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {sampleTopics.map((topic, index) => (
              <motion.article
                key={topic.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => onTopicClick?.(topic.slug)}
                className="group cursor-pointer"
                data-testid={`card-sample-topic-${topic.id}`}
              >
                <div className="relative bg-card rounded-3xl p-8 sm:p-10 border border-border/50 h-full transition-all duration-300 hover:border-border hover:shadow-lg hover:-translate-y-1">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">{topic.category || "General"}</span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className={`text-sm font-medium capitalize ${difficultyColors[topic.difficulty as keyof typeof difficultyColors] || difficultyColors.beginner}`}>
                        {topic.difficulty || "Beginner"}
                      </span>
                    </div>
                    <Badge variant="default" className="bg-green-600 text-xs shrink-0">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Free
                    </Badge>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-semibold mb-3 group-hover:text-primary transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-lg text-muted-foreground mb-6 leading-relaxed line-clamp-3">
                    {topic.description || "Explore this topic from the ground up using first principles thinking."}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTime(topic.estimatedMinutes)}</span>
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
        )}
      </div>
    </section>
  );
}
