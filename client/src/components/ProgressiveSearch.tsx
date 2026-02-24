import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Sparkles, 
  Clock, 
  ArrowRight,
  X,
  BookOpen,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface QuickResult {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  keyPoints: string[];
  existing?: boolean;
  slug?: string;
}

type SearchState = 'idle' | 'loading' | 'ready' | 'error';

export default function ProgressiveSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [status, setStatus] = useState<SearchState>('idle');
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setIsOpen(false);
      setResult(null);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setStatus('loading');
    setProgress(10);
    setIsOpen(true);

    try {
      const response = await apiRequest('POST', '/api/topics/quick-search', { 
        title: searchQuery 
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResult(data);
      setStatus('ready');
      setProgress(100);
    } catch (err) {
      console.error('Search error:', err);
      setStatus('error');
    }
  };

  const handleStartLearning = () => {
    if (!result) return;
    
    const slug = result.slug || result.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    setLocation(`/topic/${slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && result && status === 'ready') {
      handleStartLearning();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResult(null);
    setIsOpen(false);
    setStatus('idle');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-10 py-6 text-lg rounded-xl border-2 border-border focus:border-primary shadow-sm"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <Card className="mt-2 shadow-lg border-border animate-in fade-in slide-in-from-top-2 duration-200">
          <CardContent className="p-0">
            {/* Loading State */}
            {status === 'loading' && (
              <div className="p-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-muted-foreground">Creating your lesson...</p>
                <p className="text-xs text-muted-foreground mt-1">This takes 2-3 seconds</p>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="p-6 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                <p className="text-muted-foreground">Something went wrong</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => performSearch(query)}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Result State */}
            {status === 'ready' && result && (
              <div className="max-h-[400px] overflow-y-auto">
                {/* Header */}
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{result.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{result.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                        <Badge variant="outline" className="text-xs">{result.difficulty}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {result.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key Points */}
                <div className="p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                    What You'll Learn
                  </p>
                  <ul className="space-y-2">
                    {result.keyPoints.slice(0, 4).map((point, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="p-4 border-t bg-muted/20">
                  <Button 
                    onClick={handleStartLearning}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <BookOpen className="h-4 w-4" />
                    Start Learning
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
