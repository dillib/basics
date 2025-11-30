import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import heroImage from "@assets/generated_images/abstract_learning_neural_network_hero.png";

interface HeroSectionProps {
  onSearch?: (query: string) => void;
  onTopicClick?: (topic: string) => void;
}

// todo: remove mock functionality
const exampleTopics = [
  "Quantum Mechanics",
  "Machine Learning",
  "Starting a Business",
  "Philosophy of Mind",
  "Blockchain",
];

export default function HeroSection({ onSearch, onTopicClick }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log("Search triggered:", searchQuery);
      onSearch?.(searchQuery);
    }
  };

  const handleTopicClick = (topic: string) => {
    console.log("Topic clicked:", topic);
    setSearchQuery(topic);
    onTopicClick?.(topic);
  };

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      
      <div className="relative z-10 container mx-auto px-4 py-20 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30 backdrop-blur-sm">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered Learning
          </Badge>
        </div>
        
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Learn Anything From
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            First Principles
          </span>
        </h1>
        <p className="text-lg text-white/70 max-w-2xl mx-auto mb-4 text-sm">
          Introducing BasicsTutor.com
        </p>
        
        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
          Master any subject by understanding its fundamental truths. Our AI breaks down complex topics 
          into building blocks you can truly understand.
        </p>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="relative flex items-center">
            <Search className="absolute left-5 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Enter any topic to learn from first principles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 sm:h-16 pl-14 pr-36 text-base sm:text-lg bg-white/95 dark:bg-background/95 backdrop-blur-md border-0 shadow-2xl rounded-full"
              data-testid="input-hero-search"
            />
            <Button 
              type="submit" 
              size="lg"
              className="absolute right-2 rounded-full h-10 sm:h-12 px-6"
              data-testid="button-hero-search"
            >
              Explore
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-white/60">Try:</span>
          {exampleTopics.map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className="cursor-pointer border-white/20 text-white/90 bg-white/10 backdrop-blur-sm hover-elevate active-elevate-2"
              onClick={() => handleTopicClick(topic)}
              data-testid={`badge-topic-${topic.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {topic}
            </Badge>
          ))}
        </div>
      </div>
    </section>
  );
}
