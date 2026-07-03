import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Flame, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Topic } from "@shared/schema";
import { Link } from "wouter";

const difficultyColors = {
  beginner: "text-emerald-600 dark:text-emerald-400",
  intermediate: "text-amber-600 dark:text-amber-400",
  advanced: "text-rose-600 dark:text-rose-400",
};

interface TrendingTopicsProps {
  onTopicClick?: (topicSlug: string) => void;
}

const formatTime = (minutes: number | null) => {
  if (!minutes) return "30 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Refreshed daily from real search trends (see server/refresh-trending-topics.ts).
 * Bonus content, not core value prop — hides entirely rather than showing an
 * empty state, since it's normal for there to be nothing here before the
 * first scheduled run.
 */
export default function TrendingTopics({ onTopicClick }: TrendingTopicsProps) {
  const { data: trendingTopics = [] } = useQuery<Topic[]>({
    queryKey: ['/api/topics/trending'],
  });

  if (trendingTopics.length === 0) return null;

  return (
    <section className="py-20 sm:py-24 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-4">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">Trending today</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight" data-testid="text-trending-title">
            What the world is searching for, explained
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trendingTopics.map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <Link
                href={`/topic/${topic.slug}`}
                onClick={() => onTopicClick?.(topic.slug)}
                className="card-hover group block h-full rounded-2xl border border-border/50 bg-card p-6"
                data-testid={`card-trending-topic-${topic.id}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    {topic.category || "General"}
                  </Badge>
                  <Badge variant="outline" className="text-xs gap-1 border-orange-500/30 text-orange-600 dark:text-orange-400">
                    <Flame className="h-3 w-3" />
                    Trending
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {topic.title}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {topic.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className={`font-medium capitalize ${difficultyColors[topic.difficulty as keyof typeof difficultyColors] || difficultyColors.beginner}`}>
                    {topic.difficulty || "Beginner"}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{formatTime(topic.estimatedMinutes)}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
