import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Search, Play } from "lucide-react";
import { motion } from "framer-motion";

interface HeroSectionProps {
  onSearch?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
}

export default function HeroSection({ onSearch, onTopicClick }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Search triggered:", searchQuery);
      onSearch?.(searchQuery);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-background via-background to-accent/20">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto"
        >
          <p className="text-sm font-medium text-primary mb-6 tracking-wide uppercase" data-testid="text-hero-tagline">
            Learn smarter, not harder
          </p>

          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight text-foreground mb-8 leading-[1.1]">
            Understand anything
            <span className="block bg-gradient-to-r from-primary via-purple-500 to-violet-500 bg-clip-text text-transparent">
              from first principles
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light">
            BasicsTutor breaks down complex topics into fundamental building blocks. 
            Learn the way great thinkers do.
          </p>

          <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-violet-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-card border border-border rounded-full shadow-lg">
                <Search className="absolute left-6 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="What do you want to learn?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-16 pl-14 pr-40 text-lg bg-transparent border-0 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                  data-testid="input-hero-search"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="absolute right-2 rounded-full h-12 px-8 font-medium"
                  data-testid="button-hero-search"
                >
                  Start learning
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {["Quantum Physics", "Machine Learning", "Economics", "Philosophy"].map((topic) => (
              <button
                key={topic}
                onClick={() => {
                  setSearchQuery(topic);
                  onTopicClick?.(topic);
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full border border-transparent hover:border-border hover:bg-accent/50"
                data-testid={`button-topic-${topic.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {topic}
              </button>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-6"
          >
            <Button variant="ghost" size="lg" className="text-muted-foreground group" data-testid="button-watch-demo">
              <div className="mr-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Play className="h-4 w-4 text-primary ml-0.5" />
              </div>
              Watch how it works
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
