import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Lightbulb, 
  BookOpen, 
  Sparkles, 
  Shield, 
  CheckCircle2,
  Loader2 
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface GenerationStage {
  id: string;
  label: string;
  description: string;
  icon: typeof Search;
  duration: number;
}

const stages: GenerationStage[] = [
  {
    id: "analyzing",
    label: "Analyzing Topic",
    description: "Understanding your topic and its domain...",
    icon: Search,
    duration: 2500,
  },
  {
    id: "principles",
    label: "Identifying First Principles",
    description: "Breaking down into fundamental concepts...",
    icon: Lightbulb,
    duration: 4000,
  },
  {
    id: "explanations",
    label: "Crafting Explanations",
    description: "Writing clear, accessible explanations...",
    icon: BookOpen,
    duration: 5000,
  },
  {
    id: "analogies",
    label: "Adding Real-World Analogies",
    description: "Creating relatable examples and comparisons...",
    icon: Sparkles,
    duration: 3500,
  },
  {
    id: "validating",
    label: "Validating Accuracy",
    description: "Fact-checking and ensuring quality...",
    icon: Shield,
    duration: 3500,
  },
  {
    id: "finalizing",
    label: "Finalizing Content",
    description: "Preparing your personalized learning path...",
    icon: CheckCircle2,
    duration: 2500,
  },
];

interface GenerationProgressProps {
  isGenerating: boolean;
  topicTitle: string;
}

export default function GenerationProgress({ isGenerating, topicTitle }: GenerationProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [stageProgress, setStageProgress] = useState(0);
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStageIndex(0);
      setStageProgress(0);
      setCompletedStages(new Set());
      return;
    }

    const currentStage = stages[currentStageIndex];
    if (!currentStage) return;

    const progressInterval = setInterval(() => {
      setStageProgress((prev) => {
        const increment = 100 / (currentStage.duration / 100);
        return Math.min(prev + increment, 100);
      });
    }, 100);

    const stageTimer = setTimeout(() => {
      setCompletedStages((prev) => new Set(Array.from(prev).concat(currentStage.id)));
      setStageProgress(0);
      
      if (currentStageIndex < stages.length - 1) {
        setCurrentStageIndex((prev) => prev + 1);
      }
    }, currentStage.duration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stageTimer);
    };
  }, [isGenerating, currentStageIndex]);

  if (!isGenerating) return null;

  const currentStage = stages[currentStageIndex];
  const overallProgress = Math.round(
    ((currentStageIndex + stageProgress / 100) / stages.length) * 100
  );

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
          <span className="text-xs text-muted-foreground">{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} className="h-2" />
      </div>

      <div className="space-y-3">
        {stages.map((stage, index) => {
          const isCompleted = completedStages.has(stage.id);
          const isCurrent = index === currentStageIndex;
          const isPending = index > currentStageIndex;
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

              {isCurrent && (
                <div className="w-16">
                  <Progress value={stageProgress} className="h-1" />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          This usually takes 20-30 seconds. Your learning content is being carefully crafted.
        </p>
      </div>
    </motion.div>
  );
}
