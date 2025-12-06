import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Loader2, Sparkles, Users, BookOpen, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onGenerateTopic?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
  isGenerating?: boolean;
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

export default function HeroSection({ onGenerateTopic, onTopicClick, isGenerating = false }: HeroSectionProps) {
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
              AI-powered first principles learning
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
            Master any topic by{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              understanding the fundamentals
            </span>
          </motion.h1>

          <motion.p 
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.2}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Enter any topic and let AI break it down into core principles. 
            Build deep understanding with interactive quizzes and personalized learning paths.
          </motion.p>

          <motion.form 
            onSubmit={handleSearch} 
            className="max-w-xl mx-auto mb-6"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.3}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-violet-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card border border-border rounded-full shadow-lg">
                <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="What do you want to learn?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-14 pl-12 pr-36 text-base bg-transparent border-0 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-hero-search"
                  disabled={isGenerating}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 rounded-full h-10 px-6 font-medium"
                  data-testid="button-hero-search"
                  disabled={!searchQuery.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating
                    </>
                  ) : (
                    <>
                      Start learning
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.form>

          <motion.div 
            className="flex flex-wrap items-center justify-center gap-2 mb-10"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.4}
          >
            <span className="text-sm text-muted-foreground">Try:</span>
            {["Quantum Physics", "Machine Learning", "Economics", "Philosophy"].map((topic) => (
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
              <span>Free sample topics</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
              <span>Interactive quizzes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10">
                <Users className="h-4 w-4 text-purple-500" />
              </div>
              <span>AI-powered tutoring</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
