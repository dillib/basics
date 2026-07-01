import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Lightbulb,
  BookOpen,
  Sparkles,
  Shield,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface GenerationStage {
  id: string;
  label: string;
  description: string;
  icon: typeof Search;
  minProgress: number;
}

const stages: GenerationStage[] = [
  { id: "analyzing", label: "Analyzing Topic", description: "Understanding your topic and its domain...", icon: Search, minProgress: 0 },
  { id: "principles", label: "Identifying First Principles", description: "Breaking down into fundamental concepts...", icon: Lightbulb, minProgress: 20 },
  { id: "content", label: "Crafting Explanations", description: "Writing clear, accessible explanations...", icon: BookOpen, minProgress: 45 },
  { id: "validating", label: "Validating Accuracy", description: "Fact-checking and ensuring quality...", icon: Shield, minProgress: 70 },
  { id: "finalizing", label: "Finalizing Content", description: "Preparing your personalized learning path...", icon: CheckCircle2, minProgress: 90 },
];

const learningTips = [
  "💡 First principles thinking: Break complex ideas into their most basic elements",
  "🧠 The best learning happens when you actively explain concepts to others",
  "📚 Spaced repetition is proven to improve long-term retention by up to 200%",
  "🎯 Focus on understanding WHY something works, not just HOW it works",
  "⚡ Short, frequent study sessions are more effective than marathon cramming",
  "🔄 Testing yourself is more effective than re-reading material",
  "🎨 Visual analogies help connect abstract concepts to real-world examples",
  "🚀 Learning is most effective when you're slightly outside your comfort zone",
];

interface GenerationProgressProps {
  isGenerating?: boolean;
  jobId?: string | null;
  topicTitle: string;
  onComplete?: (result: { slug: string }) => void;
  onError?: (error: Error) => void;
}

/**
 * Shows progress for a background topic-generation job. Once a `jobId` exists
 * it polls the real status endpoint and reflects server-reported progress;
 * before that (the brief window between submit and job creation) it shows an
 * indeterminate "starting" state.
 */
export default function GenerationProgress({
  isGenerating,
  jobId,
  topicTitle,
  onComplete,
  onError,
}: GenerationProgressProps) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  const isPolling = !!jobId;
  const active = isPolling || isGenerating;

  // Rotate tips every 5 seconds.
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % learningTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [active]);

  const { data: statusData, isError, error } = useQuery<{
    state: "pending" | "processing" | "completed" | "failed";
    progress: number;
    result: { slug: string } | null;
    error: string | null;
  }>({
    queryKey: ["/api/topics/generate/status", jobId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/topics/generate/status/${jobId}`);
      if (!res.ok) throw new Error("Failed to check status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return state === "completed" || state === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (statusData?.state === "completed" && statusData.result?.slug) {
      onComplete?.(statusData.result);
    }
    if (statusData?.state === "failed" || isError) {
      onError?.((error as Error) || new Error(statusData?.error || "Generation failed"));
    }
  }, [statusData, isError, error, onComplete, onError]);

  const serverProgress = statusData?.progress ?? 0;

  // Map server progress to the active stage.
  let currentStageIndex = 0;
  if (isPolling) {
    currentStageIndex = stages.findIndex((s, i) => {
      const next = stages[i + 1];
      if (!next) return true;
      return serverProgress >= s.minProgress && serverProgress < next.minProgress;
    });
    if (currentStageIndex === -1) currentStageIndex = stages.length - 1;
    if (statusData?.state === "completed") currentStageIndex = stages.length - 1;
  }

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mt-6 p-6 bg-gradient-to-br from-primary/5 via-background to-accent/5 rounded-lg border border-primary/20"
      data-testid="generation-progress"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-base mb-1">Generating: {topicTitle}</h4>
            <p className="text-xs text-muted-foreground">
              {isPolling && serverProgress < 100
                ? "Building your lesson — this usually takes 30–60 seconds"
                : serverProgress >= 100
                ? "Almost done!"
                : "Starting..."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {isPolling ? `${serverProgress}%` : ""}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {isPolling ? "Complete" : ""}
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-full">
          <Progress value={isPolling ? serverProgress : undefined} className="h-3" />
          {(!isPolling || (serverProgress > 0 && serverProgress < 100)) && (
            <motion.div
              className="absolute top-0 left-0 h-full w-1/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent pointer-events-none"
              animate={{ left: ["-33%", "133%"] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isCompleted = isPolling ? index < currentStageIndex : false;
          const isCurrent = isPolling ? index === currentStageIndex : index === 0;
          const isPending = isPolling ? index > currentStageIndex : index !== 0;
          const StageIcon = stage.icon;

          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{ opacity: isPending ? 0.4 : 1, x: isCurrent ? 4 : 0 }}
              className={`flex items-center gap-3 p-2 rounded-md transition-colors ${
                isCurrent ? "bg-primary/10" : ""
              }`}
              data-testid={`stage-${stage.id}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isCompleted
                    ? "bg-green-500 text-white"
                    : isCurrent
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isCurrent ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                  >
                    <Loader2 className="h-4 w-4" />
                  </motion.div>
                ) : (
                  <StageIcon className="h-4 w-4" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-green-600 dark:text-green-400"
                      : isCurrent
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {stage.label}
                </p>
                <AnimatePresence mode="wait">
                  {isCurrent && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-xs text-muted-foreground"
                    >
                      {stage.description}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {statusData?.state === "failed" && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>Generation failed. Please try again.</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTipIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/30 rounded-full">
              <Sparkles className="h-3 w-3 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                {learningTips[currentTipIndex]}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
