import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Loader2, Sparkles, Users, BookOpen, Zap } from "lucide-react";
import { motion } from "framer-motion";
import GenerationProgress from "./GenerationProgress";
import ProgressiveSearch from "./ProgressiveSearch";

interface HeroSectionProps {
  onGenerateTopic?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
  isGenerating?: boolean;
  topicTitle?: string;
  jobId?: string | null;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

const fadeUpVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

export default function HeroSection({ 
  onGenerateTopic, 
  onTopicClick, 
  isGenerating = false,
  topicTitle = "",
  jobId = null,
  onComplete,
  onError
}: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isGenerating) {
      onGenerateTopic?.(searchQuery.trim());
    }
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/8 to-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/6 to-fuchsia-500/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary" data-testid="text-hero-tagline">
              First Principles Dictionary
            </span>
          </motion.div>

          <motion.h1 
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-foreground mb-6"
            data-testid="text-hero-headline"
          >
            Understand{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              anything
            </span>
            , explained from first principles
          </motion.h1>

          <motion.p 
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Stop memorizing. Start understanding. Get instant AI-generated breakdowns of any topic—from quantum physics to baking bread—explained from the ground up.
          </motion.p>

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="max-w-2xl mx-auto"
          >
            <ProgressiveSearch />
          </motion.div>

          <motion.div 
            className="flex flex-wrap items-center justify-center gap-2 mb-10"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.4}
          >
            <span className="text-sm text-muted-foreground">Popular:</span>
            {["How ChatGPT Works", "Cryptocurrency Basics", "Personal Finance 101", "Climate Change Science"].map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  if (!isGenerating) {
                    setSearchQuery(topic);
                    onGenerateTopic?.(topic);
                  }
                }}
                disabled={isGenerating}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-border/50 hover:border-border hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`button-topic-${topic.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {topic}
              </button>
            ))}
          </motion.div>

          {/* Generation Progress */}
          {isGenerating && (
            <GenerationProgress 
              isGenerating={isGenerating && !jobId} // Show indeterminate if no jobId yet
              jobId={jobId}
              topicTitle={topicTitle || searchQuery}
              onComplete={onComplete}
              onError={onError}
            />
          )}

          <motion.div 
            className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.5}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <Zap className="h-4 w-4 text-green-500" />
              </div>
              <span>Printable reference sheets</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
              <span>Classroom ready</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <span>For teachers & students</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
