import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Play, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onGenerateTopic?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
  isGenerating?: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const wordVariants = {
  hidden: { 
    opacity: 0, 
    y: 40,
    filter: "blur(10px)",
  },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

const fadeUpVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.25, 0.4, 0.25, 1],
    },
  }),
};

function AnimatedWords({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <motion.span
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={className}
    >
      {words.map((word, index) => (
        <motion.span
          key={index}
          variants={wordVariants}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

export default function HeroSection({ onGenerateTopic, onTopicClick, isGenerating = false }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && !isGenerating) {
      onGenerateTopic?.(searchQuery.trim());
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-muted/50">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/8 to-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/6 to-fuchsia-500/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-blue-500/4 to-indigo-500/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
            className="text-sm font-medium text-primary mb-6 tracking-wide uppercase" 
            data-testid="text-hero-tagline"
          >
            Learn smarter, not harder
          </motion.p>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground mb-8 leading-[1.1]">
            <AnimatedWords text="Master any topic" />
            <motion.span 
              className="block bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatedWords text="starting from the fundamentals" />
            </motion.span>
          </h1>

          <motion.p 
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={0.8}
            className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light"
          >
            Enter any topic and let AI break it down into core first principles. 
            Build deep understanding, not just surface knowledge.
          </motion.p>

          <motion.form 
            onSubmit={handleSearch} 
            className="max-w-xl mx-auto mb-8"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={1.0}
          >
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-violet-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card border border-border rounded-full shadow-lg">
                <Search className="absolute left-6 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Enter any topic to learn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-16 pl-14 pr-40 text-lg bg-transparent border-0 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-hero-search"
                  disabled={isGenerating}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 rounded-full h-12 px-8 font-medium"
                  data-testid="button-hero-search"
                  disabled={!searchQuery.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
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
            className="flex flex-wrap items-center justify-center gap-3 mb-16"
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={1.2}
          >
            <span className="text-sm text-muted-foreground">Try:</span>
            {["Quantum Physics", "Machine Learning", "Economics", "Philosophy"].map((topic, index) => (
              <motion.button
                key={topic}
                onClick={() => {
                  if (!isGenerating) {
                    setSearchQuery(topic);
                    onGenerateTopic?.(topic);
                  }
                }}
                disabled={isGenerating}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-transparent hover:border-border hover:bg-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid={`button-topic-${topic.toLowerCase().replace(/\s+/g, "-")}`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                {topic}
              </motion.button>
            ))}
          </motion.div>

          <motion.div
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            custom={1.4}
            className="flex items-center justify-center gap-6"
          >
            <Button variant="ghost" size="lg" className="text-muted-foreground group" data-testid="button-watch-demo">
              <div className="mr-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Play className="h-4 w-4 text-primary ml-0.5" />
              </div>
              Watch how it works
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
