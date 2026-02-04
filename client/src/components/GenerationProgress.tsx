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
  AlertCircle
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";

interface GenerationStage {
  id: string;
  label: string;
  description: string;
  icon: typeof Search;
  minProgress: number; // Map server progress to stages
}

const stages: GenerationStage[] = [
  {
    id: "analyzing",
    label: "Analyzing Topic",
    description: "Understanding your topic and its domain...",
    icon: Search,
    minProgress: 0,
  },
  {
    id: "principles",
    label: "Identifying First Principles",
    description: "Breaking down into fundamental concepts...",
    icon: Lightbulb,
    minProgress: 20,
  },
  {
    id: "content",
    label: "Crafting Explanations",
    description: "Writing clear, accessible explanations...",
    icon: BookOpen,
    minProgress: 40,
  },
  {
    id: "validating",
    label: "Validating Accuracy",
    description: "Fact-checking and ensuring quality...",
    icon: Shield,
    minProgress: 70,
  },
  {
    id: "finalizing",
    label: "Finalizing Content",
    description: "Preparing your personalized learning path...",
    icon: CheckCircle2,
    minProgress: 90,
  },
];

interface GenerationProgressProps {
  isGenerating?: boolean; // Legacy prop, can act as a fallback
  jobId?: string | null;
  topicTitle: string;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export default function GenerationProgress({ 
  isGenerating, 
  jobId, 
  topicTitle,
  onComplete,
  onError
}: GenerationProgressProps) {
  // If we have a jobId, we poll. If just isGenerating, we show indeterminate/fake loading (legacy).
  const isPolling = !!jobId;
  const active = isPolling || isGenerating;

  // Poll status
  const { data: statusData, isError, error } = useQuery({
    queryKey: [`/api/topics/generate/status/${jobId}`],
    queryFn: async () => {
      if (!jobId) return null;
      const res = await apiRequest("GET", `/api/topics/generate/status/${jobId}`);
      if (!res.ok) throw new Error("Failed to check status");
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return (state === 'completed' || state === 'failed') ? false : 2000; // Poll every 2s
    },
  });

  useEffect(() => {
    if (statusData?.state === 'completed' && statusData?.result) {
      onComplete?.(statusData.result);
    }
    if (statusData?.state === 'failed' || isError) {
      onError?.(error as Error || new Error(statusData?.error || "Generation failed"));
    }
  }, [statusData, isError, error, onComplete, onError]);

  // Determine current progress and stage
  const serverProgress = statusData?.progress || 0;
  
  // Find current active stage based on progress
  let currentStageIndex = 0;
  if (isPolling) {
    currentStageIndex = stages.findIndex((s, i) => {
      const nextStage = stages[i + 1];
      if (!nextStage) return true; // Last stage
      return serverProgress >= s.minProgress && serverProgress < nextStage.minProgress;
    });
    if (currentStageIndex === -1) currentStageIndex = stages.length - 1;
    // If completed, ensure we show last stage
    if (statusData?.state === 'completed') currentStageIndex = stages.length - 1;
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
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-sm">Generating: {topicTitle}</h4>
          <span className="text-xs text-muted-foreground">{isPolling ? `${serverProgress}%` : 'Processing...'}</span>
        </div>
        <Progress value={isPolling ? serverProgress : undefined} className="h-2" />
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isCompleted = isPolling ? index < currentStageIndex : false;
          const isCurrent = isPolling ? index === currentStageIndex : index === 0;
          const isPending = isPolling ? index > currentStageIndex : true;
          const StageIcon = stage.icon;

          return (
            <motion.div
              key={stage.id}
              initial={false}
              animate={{
                opacity: isPending ? 0.4 : 1,
                x: isCurrent ? 4 : 0,
              }}
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

      {statusData?.state === 'failed' && (
         <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm">
             <AlertCircle className="h-4 w-4" />
             <span>Generation failed. Please try again.</span>
         </div>
      )}

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          {isPolling ? "Our AI is crafting your content in the background." : "Starting generation..."}
        </p>
      </div>
    </motion.div>
  );
}
