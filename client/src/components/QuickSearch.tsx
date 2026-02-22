import { useState, useEffect, useRef } from "react";
import { useNavigate } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Sparkles, 
  Clock, 
  ArrowRight,
  X,
  BookOpen,
  Zap
} from "lucide-react";
import { useQuickSearch } from "@/hooks/useQuickSearch";

export default function QuickSearch() {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { result, isLoading, error, search, clear } = useQuickSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        search(query);
        setShowResults(true);
      } else {
        clear();
        setShowResults(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query, search, clear]);

  const handleSelectTopic = () => {
    if (result) {
      const slug = result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      navigate(`/topic/${slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && result) {
      handleSelectTopic();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn? (e.g., 'Machine Learning', 'Photosynthesis')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-12 py-6 text-lg rounded-2xl border-2 border-primary/20 focus:border-primary shadow-lg"
        />
        
        {query && (
          <button
            onClick={() => {
              setQuery("");
              clear();
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Quick Results Dropdown */}
      {showResults && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 shadow-xl border-primary/20">
          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-sm text-muted-foreground">AI is generating your lesson... (2-3 seconds)</span>
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={() => search(query)} className="mt-2">
                  Try Again
                </Button>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Result Header */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{result.title}</h3>
                    <p className="text-sm text-muted-foreground">{result.description}</p>
                  </div>
                </div>

                {/* Meta Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{result.category}</Badge>
                  <Badge variant="outline">{result.difficulty}</Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {result.estimatedMinutes} min
                  </div>
                </div>

                {/* Key Points Preview */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Key Points:</p>
                  <ul className="space-y-1">
                    {result.keyPoints.slice(0, 3).map((point, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA Button */}
                <Button 
                  onClick={handleSelectTopic}
                  className="w-full gap-2"
                  size="lg"
                >
                  <BookOpen className="h-4 w-4" />
                  Start Learning
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
