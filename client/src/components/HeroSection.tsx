import { useState } from "react";
import { Sparkles, Users, BookOpen, Zap } from "lucide-react";
import { motion } from "framer-motion";
import GenerationProgress from "./GenerationProgress";
import ProgressiveSearch from "./ProgressiveSearch";

interface HeroSectionProps {
  onGenerateTopic?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
  isGenerating?: boolean;
  topicTitle?: string;
  jobId?: string | null;
  onComplete?: (result: { slug: string }) => void;
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
  isGenerating = false,
  topicTitle = "",
  jobId = null,
  onComplete,
  onError,
}: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      <div className="absolute inset-0 overflow-hidden">
        {/* Quiet structure instead of empty space — a faint dot-grid, fading
            out toward the edges so it never competes with the content. */}
        <div className="absolute inset-0 bg-dot-grid [mask-image:radial-gradient(ellipse_60%_60%_at_50%_35%,black,transparent)]" />
        {/* One focused spotlight anchored behind the search bar — the single
            most important element on the page — rather than decorative blobs
            scattered around it. */}
        <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[420px] bg-primary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-glow-sm mb-8"
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
                className="text-sm text-muted-foreground hover:text-foreground transition-all duration-200 px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/30 hover:bg-accent/50 hover:shadow-glow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`button-topic-${topic.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {topic}
              </button>
            ))}
          </motion.div>

          {/* Generation Progress */}
          {(isGenerating || jobId) && (
            <GenerationProgress
              isGenerating={isGenerating}
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
