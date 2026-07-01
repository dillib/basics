import { useState, useEffect, useRef } from "react";
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

type SearchState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export default function ProgressiveSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [status, setStatus] = useState<SearchState>('idle');
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setIsOpen(false);
      setResult(null);
      setStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    setStatus('loading');
    setIsOpen(true);

    try {
      const response = await apiRequest('POST', '/api/topics/quick-search', { 
        title: searchQuery 
      });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResult(data);
      
      // If topic already exists, we're ready to go
      if (data.existing && data.slug) {
        setStatus('ready');
      } else {
        // Need to generate full topic
        setStatus('ready');
      }
    } catch (err) {
      console.error('Search error:', err);
      setStatus('error');
    }
  };

  // Poll a background generation job until it finishes, resolving with the
  // topic slug or throwing on failure/timeout.
  const pollJob = async (jobId: string): Promise<string> => {
    for (let i = 0; i < 90; i++) { // ~3 minutes at 2s intervals
      await new Promise((r) => setTimeout(r, 2000));
      const res = await apiRequest('GET', `/api/topics/generate/status/${jobId}`);
      if (!res.ok) continue;
      const s = await res.json();
      if (s.state === 'completed' && s.result?.slug) return s.result.slug;
      if (s.state === 'failed') throw new Error(s.error || 'Generation failed');
    }
    throw new Error('Generation timed out');
  };

  const handleStartLearning = async () => {
    if (!result) return;

    const fallbackSlug = result.slug || result.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Existing topics navigate immediately.
    if (result.existing) {
      setLocation(`/topic/${fallbackSlug}`);
      return;
    }

    // New topics generate in the background — start the job, then poll.
    setStatus('generating');
    try {
      const response = await apiRequest('POST', '/api/topics/generate', {
        title: result.title,
      });
      const data = await response.json();

      if (data.existing && data.topic?.slug) {
        setLocation(`/topic/${data.topic.slug}`);
        return;
      }
      if (data.jobId) {
        const slug = await pollJob(data.jobId);
        setLocation(`/topic/${slug}`);
        return;
      }
      throw new Error(data.message || 'Failed to start generation');
    } catch (err) {
      console.error('Generation error:', err);
      setStatus('error');
    }
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
    <div className="w-full max-w-xl mx-auto relative" ref={dropdownRef}>
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
          className="pl-12 pr-10 py-5 text-base rounded-xl border-2"
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
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <Card className="shadow-xl border overflow-hidden">
            <CardContent className="p-0">
              
              {/* Loading State */}
              {status === 'loading' && (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Creating your lesson...</p>
                </div>
              )}

              {/* Generating State */}
              {status === 'generating' && (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Building full lesson...</p>
                  <p className="text-xs text-muted-foreground mt-1">This may take 10-15 seconds</p>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="p-6 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Something went wrong</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => performSearch(query)}
                  >
                    Try Again
                  </Button>
                </div>
              )}

              {/* Result State */}
              {status === 'ready' && result && (
                <div>
                  {/* Header */}
                  <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base break-words">{result.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{result.description}</p>
                        
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">{result.category}</Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {result.estimatedMinutes} min
                          </span>
                          {result.existing && (
                            <Badge variant="default" className="text-xs bg-green-600">Ready</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Points */}
                  <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">
                      Key Points
                    </p>
                    <ul className="space-y-1.5">
                      {result.keyPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <span className="break-words">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA */}
                  <div className="p-4 border-t bg-slate-50 dark:bg-slate-900">
                    <Button 
                      onClick={handleStartLearning}
                      className="w-full gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      {result.existing ? 'Start Learning' : 'Generate Full Lesson'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {!result.existing && (
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        Click to generate the complete lesson with principles and quizzes
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
