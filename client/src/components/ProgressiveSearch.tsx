import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Sparkles, 
  Clock, 
  ArrowRight,
  X,
  BookOpen,
  Zap,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface GenerationStatus {
  status: 'quick' | 'generating' | 'principles' | 'mindmap' | 'complete' | 'error';
  progress: number;
  message: string;
}

export default function ProgressiveSearch() {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickResult | null>(null);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced quick search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        performQuickSearch(query.trim());
      } else {
        setQuickResult(null);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performQuickSearch = async (searchQuery: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setGenerationStatus({
      status: 'quick',
      progress: 10,
      message: 'Understanding your question...'
    });

    try {
      const response = await apiRequest('POST', '/api/topics/quick-search', { 
        title: searchQuery 
      }, { signal: abortControllerRef.current.signal });
      
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setQuickResult(data);
      setShowResults(true);
      
      // If topic exists, show ready state
      if (data.existing) {
        setGenerationStatus({
          status: 'complete',
          progress: 100,
          message: 'Ready!'
        });
      } else {
        // Start full generation in background
        startFullGeneration(searchQuery);
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Quick search error:', err);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const startFullGeneration = async (title: string) => {
    setGenerationStatus({
      status: 'generating',
      progress: 20,
      message: 'Creating your lesson...'
    });

    try {
      const response = await apiRequest('POST', '/api/topics/generate', { title });
      const data = await response.json();

      if (data.existing && data.topic) {
        setGenerationStatus({
          status: 'complete',
          progress: 100,
          message: 'Ready!'
        });
        setQuickResult(prev => prev ? { ...prev, existing: true, slug: data.topic.slug } : null);
      } else if (data.jobId) {
        // Poll for job completion
        pollJobStatus(data.jobId);
      }
    } catch (error) {
      setGenerationStatus({
        status: 'error',
        progress: 0,
        message: 'Something went wrong'
      });
    }
  };

  const pollJobStatus = async (jobId: string) => {
    const checkStatus = async () => {
      try {
        const response = await apiRequest('GET', `/api/jobs/${jobId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          setGenerationStatus({
            status: 'complete',
            progress: 100,
            message: 'Ready!'
          });
          // Refresh quick result with slug
          if (data.topic) {
            setQuickResult(prev => prev ? { 
              ...prev, 
              existing: true, 
              slug: data.topic.slug 
            } : null);
          }
        } else if (data.status === 'failed') {
          setGenerationStatus({
            status: 'error',
            progress: 0,
            message: 'Generation failed'
          });
        } else {
          // Still processing - simulate progress
          setGenerationStatus(prev => ({
            status: 'generating',
            progress: Math.min(90, (prev?.progress || 20) + 5),
            message: data.message || 'Creating your lesson...'
          }));
          setTimeout(checkStatus, 1000);
        }
      } catch (error) {
        console.error('Job polling error:', error);
      }
    };

    checkStatus();
  };

  const handleStartLearning = () => {
    if (quickResult?.existing && quickResult.slug) {
      setLocation(`/topic/${quickResult.slug}`);
    } else if (quickResult) {
      // Generate slug from title
      const slug = quickResult.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      setLocation(`/topic/${slug}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && quickResult) {
      handleStartLearning();
    }
  };

  const clearSearch = () => {
    setQuery("");
    setQuickResult(null);
    setShowResults(false);
    setGenerationStatus(null);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn? Try 'Machine Learning' or 'Photosynthesis'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="pl-12 pr-12 py-6 text-lg rounded-2xl border-2 border-primary/20 focus:border-primary shadow-lg"
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
            <Card className="shadow-xl border-primary/20 overflow-hidden">
              <CardContent className="p-0">
                {!quickResult ? (
                  <div className="p-6 flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-muted-foreground">Thinking... (2-3 seconds)</span>
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* Quick Result Header */}
                    <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{quickResult.title}</h3>
                          <p className="text-sm text-muted-foreground">{quickResult.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="secondary" size="sm">{quickResult.category}</Badge>
                            <Badge variant="outline" size="sm">{quickResult.difficulty}</Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {quickResult.estimatedMinutes} min read
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Key Points */}
                    <div className="p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Key Points You'll Learn
                      </p>
                      <ul className="space-y-1">
                        {quickResult.keyPoints.slice(0, 4).map((point, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Progress / CTA */}
                    <div className="p-4 bg-muted/30">
                      {generationStatus?.status === 'complete' ? (
                        <Button 
                          onClick={handleStartLearning}
                          className="w-full gap-2"
                          size="lg"
                        >
                          <BookOpen className="h-4 w-4" />
                          Start Learning
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      ) : generationStatus?.status === 'error' ? (
                        <Button 
                          variant="outline"
                          onClick={() => performQuickSearch(query)}
                          className="w-full"
                        >
                          Try Again
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{generationStatus?.message || 'Preparing...'}</span>
                            <span className="text-xs text-muted-foreground">{generationStatus?.progress || 0}%</span>
                          </div>
                          <Progress value={generationStatus?.progress || 10} className="h-2" />
                          <p className="text-xs text-muted-foreground text-center">
                            You can start learning now - content will fill in as it's ready
                          </p>
                          <Button 
                            onClick={handleStartLearning}
                            variant="outline"
                            className="w-full gap-2"
                          >
                            <BookOpen className="h-4 w-4" />
                            Start Learning (Beta)
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

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
