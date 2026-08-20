import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Clock,
  ArrowRight,
  X,
  BookOpen,
  Loader2,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { LEVELS, LEVEL_LABELS, isLevel, type Level } from "@shared/levels";

interface QuickResult {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  keyPoints: string[];
  existing?: boolean;
  slug?: string;
  /** Which audience levels already exist as pages (server-reported). */
  existingLevels?: string[];
}

/** A row from the instant library search (GET /api/topics/search). */
interface LibraryMatch {
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  estimatedMinutes: number | null;
}

// 'suggest' = typing, showing instant library matches (free, no AI).
// The AI states (loading/ready/generating) only start on an explicit action.
type SearchState = 'idle' | 'suggest' | 'loading' | 'ready' | 'generating' | 'error';

export default function ProgressiveSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<QuickResult | null>(null);
  const [libraryResults, setLibraryResults] = useState<LibraryMatch[]>([]);
  const [status, setStatus] = useState<SearchState>('idle');
  // 0-100 for the "lesson forming" bar. The server reports real milestones
  // (10 start, 55 content generated, 75 validated, 95 saved); between those it
  // sits still for a while, so we also gently ease it forward (bounded, never
  // claiming completion) so it always feels alive.
  const [genProgress, setGenProgress] = useState(0);
  // Audience level for the full lesson (Kids / Teens / Adults). Default adult.
  const [level, setLevel] = useState<Level>('adult');
  const [errorMessage, setErrorMessage] = useState('Something went wrong');
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Bumped on every new search so a slow/retried in-flight request can't
  // overwrite the results of a newer one the user has since typed.
  const searchSeqRef = useRef(0);
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

  // While generating, ease the progress bar toward a ceiling so it keeps moving
  // during the long single generation call (server sits at 10% for most of it).
  // Real milestones from the poll bump it higher via Math.max; this never
  // reaches 100 — only actual completion (navigation) ends the view.
  useEffect(() => {
    if (status !== 'generating') return;
    const id = setInterval(() => {
      setGenProgress((p) => (p < 92 ? p + Math.max(0.5, (92 - p) * 0.05) : p));
    }, 600);
    return () => clearInterval(id);
  }, [status]);

  // Debounced instant library search on keystrokes. Free DB lookup, so it can
  // run on every pause -- the paid AI quick-search (performSearch) only fires
  // on an explicit action (Enter or the "Create a lesson" row). Previously
  // every 400ms typing pause triggered a full AI generation.
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setIsOpen(false);
      setResult(null);
      setLibraryResults([]);
      setStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      const seq = ++searchSeqRef.current;
      try {
        const res = await fetch(`/api/topics/search?q=${encodeURIComponent(query.trim())}`, {
          credentials: 'include',
        });
        if (seq !== searchSeqRef.current) return;
        setLibraryResults(res.ok ? await res.json() : []);
      } catch {
        if (seq !== searchSeqRef.current) return;
        setLibraryResults([]);
      }
      setStatus('suggest');
      setIsOpen(true);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    const seq = ++searchSeqRef.current;
    await runSearch(searchQuery, seq, 0);
  };

  // `seq` guards against stale responses; `attempt` gives one automatic retry so
  // a transient AI/network blip doesn't dump the user straight to an error.
  const runSearch = async (searchQuery: string, seq: number, attempt: number): Promise<void> => {
    if (seq !== searchSeqRef.current) return; // superseded by a newer search
    setStatus('loading');
    setIsOpen(true);

    try {
      // Raw fetch (not apiRequest, which throws on non-2xx) so we can read the
      // status and treat 429 specially.
      const response = await fetch('/api/topics/quick-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: searchQuery }),
        credentials: 'include',
      });
      if (seq !== searchSeqRef.current) return;

      // Rate limited — don't retry (that makes it worse), just say so kindly.
      if (response.status === 429) {
        setErrorMessage("You're searching fast — give it a few seconds.");
        setStatus('error');
        return;
      }
      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      if (seq !== searchSeqRef.current) return;
      setResult(data);
      setStatus('ready');
    } catch (err) {
      if (seq !== searchSeqRef.current) return;
      // One quiet retry for transient failures before showing an error.
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 900));
        return runSearch(searchQuery, seq, attempt + 1);
      }
      console.error('Search error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  // Poll a background generation job until it finishes, resolving with the
  // topic slug or throwing on failure/timeout. Bails early if `seq` is
  // superseded (the user started typing a new search mid-generation).
  const pollJob = async (jobId: string, seq: number): Promise<string> => {
    for (let i = 0; i < 90; i++) { // ~3 minutes at 2s intervals
      await new Promise((r) => setTimeout(r, 2000));
      if (seq !== searchSeqRef.current) throw new Error('superseded');
      const res = await apiRequest('GET', `/api/topics/generate/status/${jobId}`);
      if (!res.ok) continue;
      const s = await res.json();
      if (typeof s.progress === 'number') setGenProgress((p) => Math.max(p, s.progress));
      if (s.state === 'completed' && s.result?.slug) return s.result.slug;
      if (s.state === 'failed') throw new Error(s.error || 'Generation failed');
    }
    throw new Error('Generation timed out');
  };

  const handleStartLearning = async () => {
    if (!result) return;
    const seq = searchSeqRef.current;

    const fallbackSlug = result.slug || result.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Navigate straight to any level whose page already exists. The server
    // reports existingLevels; fall back to the old adult-only behavior for
    // responses that predate it.
    const existingLevels = result.existingLevels ?? (result.existing ? ['adult'] : []);
    if (existingLevels.includes(level)) {
      const target = level === 'adult' ? fallbackSlug : `${fallbackSlug}-${level}`;
      setLocation(`/topic/${target}`);
      return;
    }

    // New topics generate in the background — start the job, then poll.
    // Show the outline (from the quick-search we already have) immediately.
    setGenProgress(8);
    setStatus('generating');
    try {
      const response = await apiRequest('POST', '/api/topics/generate', {
        title: result.title,
        level,
      });
      const data = await response.json();
      if (seq !== searchSeqRef.current) return; // user moved on

      if (data.existing && data.topic?.slug) {
        setLocation(`/topic/${data.topic.slug}`);
        return;
      }
      if (data.jobId) {
        const slug = await pollJob(data.jobId, seq);
        setLocation(`/topic/${slug}`);
        return;
      }
      throw new Error(data.message || 'Failed to start generation');
    } catch (err) {
      if (seq !== searchSeqRef.current) return; // superseded, not an error
      console.error('Generation error:', err);
      setStatus('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (status === 'ready' && result) {
      handleStartLearning();
    } else if (query.trim().length >= 2 && status !== 'loading' && status !== 'generating') {
      // Enter acts immediately -- no waiting out the debounce.
      performSearch(query.trim());
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResult(null);
    setLibraryResults([]);
    setIsOpen(false);
    setStatus('idle');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full max-w-xl mx-auto relative" ref={dropdownRef}>
      {/* Search Input */}
      <div className="relative rounded-2xl shadow-glow transition-shadow duration-300 focus-within:shadow-glow-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="What do you want to learn?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="search-suggestions"
          aria-autocomplete="list"
          // Overrides Input's default bg-background — without this the input
          // surface is literally the same color as the page, so only a
          // near-invisible border separated it. bg-card + a real border give
          // it actual presence at rest, not just on hover/focus.
          className="h-14 pl-12 pr-14 text-base rounded-2xl bg-card border-2 border-foreground/10 focus-visible:ring-offset-0 focus-visible:border-primary/50"
        />

        {status === 'ready' && result ? (
          <button
            onClick={handleStartLearning}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow-sm hover:shadow-glow transition-all"
            type="button"
            aria-label="Go to lesson"
            data-testid="button-search-go"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : query ? (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted transition-colors"
            type="button"
            aria-label="Clear search"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="absolute top-full left-0 right-0 mt-2 z-50"
          >
          <Card className="shadow-glow-lg border overflow-hidden rounded-2xl">
            <CardContent className="p-0">

              {/* Suggest State — instant library matches + an explicit
                  "create new" action. No AI has run yet at this point. */}
              {status === 'suggest' && (
                <div id="search-suggestions">
                  {libraryResults.length > 0 && (
                    <ul className="py-1">
                      {libraryResults.map((t) => (
                        <li key={t.slug}>
                          <Link
                            href={`/topic/${t.slug}`}
                            className="flex items-start gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors group"
                            data-testid={`link-search-${t.slug}`}
                          >
                            <div className="p-1.5 rounded-md bg-primary/10 shrink-0 mt-0.5">
                              <BookOpen className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium break-words">{t.title}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                {t.category && (
                                  <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                                )}
                                {isLevel(t.level) && t.level !== 'adult' && (
                                  <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                                    For {LEVEL_LABELS[t.level]}
                                  </Badge>
                                )}
                                {t.estimatedMinutes ? (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {t.estimatedMinutes} min
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className={libraryResults.length > 0 ? "border-t" : ""}>
                    <button
                      type="button"
                      onClick={() => performSearch(query.trim())}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                      data-testid="button-search-generate"
                    >
                      <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium break-words">
                          Create a lesson on &ldquo;{query.trim()}&rdquo;
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {libraryResults.length > 0
                            ? 'Want something different? AI builds a preview in seconds'
                            : 'Not in the library yet — AI builds a preview in seconds'}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {status === 'loading' && (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Building a quick preview…</p>
                </div>
              )}

              {/* Generating State — show the real outline forming in place of
                  a blank spinner, so generation feels instant. The outline is
                  the quick-search we already ran; full explanations + quiz are
                  being written in the background and land on navigation. */}
              {status === 'generating' && result && (
                <div>
                  {/* Header */}
                  <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base break-words">{result.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                          Writing your lesson…
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live progress bar (real milestones + gentle easing) */}
                  <div className="h-1 w-full bg-primary/10 overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${Math.min(genProgress, 96)}%` }}
                      transition={{ ease: 'easeOut', duration: 0.6 }}
                    />
                  </div>

                  {/* Outline materializing */}
                  <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2.5 uppercase">
                      Your lesson outline
                    </p>
                    <ul className="space-y-2.5">
                      {result.keyPoints.map((point, i) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.12, duration: 0.3 }}
                          className="text-sm flex items-start gap-2.5"
                        >
                          <span className="relative mt-1.5 shrink-0">
                            <span className="block h-2 w-2 rounded-full bg-primary/60" />
                            <span className="absolute inset-0 h-2 w-2 rounded-full bg-primary animate-ping" />
                          </span>
                          <span className="break-words text-foreground/90">{point}</span>
                        </motion.li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3.5">
                      Building full explanations, analogies, and a quiz — about 15–30 seconds.
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {status === 'error' && (
                <div className="p-6 text-center">
                  <AlertCircle className="h-6 w-6 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">{errorMessage}</p>
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
              {status === 'ready' && result && (() => {
                // Which levels already exist as pages (server-reported, with a
                // fallback for old responses that only had `existing`).
                const readyLevels = result.existingLevels ?? (result.existing ? ['adult'] : []);
                const levelReady = readyLevels.includes(level);
                return (
                <div>
                  {/* Header */}
                  <div className="p-4 border-b bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                        <BookOpen className="h-4 w-4 text-primary" />
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

                  {/* Audience level selector — the same topic, pitched for a
                      different age. Adults is the default. */}
                  <div className="px-4 pt-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase">Explain it for</p>
                    <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-1">
                      {LEVELS.map((lv) => (
                        <button
                          key={lv}
                          type="button"
                          onClick={() => setLevel(lv)}
                          className={cn(
                            "rounded-md py-1.5 text-xs font-medium transition-colors",
                            level === lv
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                          data-testid={`button-level-${lv}`}
                        >
                          {LEVEL_LABELS[lv]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA — the action button (replaces the old key-points list) */}
                  <div className="p-4">
                    <Button
                      onClick={handleStartLearning}
                      className="w-full gap-2"
                    >
                      {levelReady ? 'Start Learning' : 'Generate Full Lesson'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      {levelReady
                        ? 'Ready to learn'
                        : `Generate the complete ${LEVEL_LABELS[level]} lesson with principles and a quiz`}
                    </p>
                  </div>
                </div>
                );
              })()}
            </CardContent>
          </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
