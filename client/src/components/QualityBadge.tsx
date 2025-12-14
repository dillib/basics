import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sparkles, Shield, MessageSquare, Info, CheckCircle, AlertTriangle } from "lucide-react";
import type { Topic } from "@shared/schema";

interface QualityBadgeProps {
  topic: Topic;
  variant?: "default" | "compact";
  showFeedback?: boolean;
}

export default function QualityBadge({ topic, variant = "default", showFeedback = true }: QualityBadgeProps) {
  const confidenceScore = (topic as any).confidenceScore as number | null | undefined;
  const validationData = (topic as any).validationData as any | null | undefined;
  
  const hasValidation = confidenceScore != null && validationData != null;
  const isExpertVerified = hasValidation && confidenceScore >= 90;
  
  const getConfidenceLabel = (score: number) => {
    if (score >= 90) return "High Confidence";
    if (score >= 75) return "Good Confidence";
    if (score >= 60) return "Moderate Confidence";
    return "Low Confidence";
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const handleFeedback = () => {
    window.location.href = `/support?topic=${topic.id}&type=feedback`;
  };

  if (variant === "compact") {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Badge 
            variant="outline" 
            className={`cursor-pointer gap-1 ${isExpertVerified ? 'border-green-500/50 bg-green-50 dark:bg-green-950/30' : 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30'}`}
            data-testid="badge-quality-compact"
          >
            {isExpertVerified ? (
              <>
                <Shield className="h-3 w-3 text-green-600 dark:text-green-400" />
                <span className="text-green-700 dark:text-green-300">Verified</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-700 dark:text-blue-300">AI</span>
              </>
            )}
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <QualityPopoverContent 
            topic={topic} 
            confidenceScore={confidenceScore}
            validationData={validationData}
            isExpertVerified={isExpertVerified}
            hasValidation={hasValidation}
            getConfidenceLabel={getConfidenceLabel}
            getConfidenceColor={getConfidenceColor}
            showFeedback={showFeedback}
            onFeedback={handleFeedback}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge 
          variant="outline" 
          className={`cursor-pointer gap-1.5 ${isExpertVerified ? 'border-green-500/50 bg-green-50 dark:bg-green-950/30' : 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/30'}`}
          data-testid="badge-quality"
        >
          {isExpertVerified ? (
            <>
              <Shield className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
              <span className="text-green-700 dark:text-green-300">AI Verified</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-700 dark:text-blue-300">AI-Generated</span>
            </>
          )}
          <Info className="h-3 w-3 opacity-50" />
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <QualityPopoverContent 
          topic={topic} 
          confidenceScore={confidenceScore}
          validationData={validationData}
          isExpertVerified={isExpertVerified}
          hasValidation={hasValidation}
          getConfidenceLabel={getConfidenceLabel}
          getConfidenceColor={getConfidenceColor}
          showFeedback={showFeedback}
          onFeedback={handleFeedback}
        />
      </PopoverContent>
    </Popover>
  );
}

interface QualityPopoverContentProps {
  topic: Topic;
  confidenceScore: number | null | undefined;
  validationData: any | null | undefined;
  isExpertVerified: boolean;
  hasValidation: boolean;
  getConfidenceLabel: (score: number) => string;
  getConfidenceColor: (score: number) => string;
  showFeedback: boolean;
  onFeedback: () => void;
}

function QualityPopoverContent({
  confidenceScore,
  validationData,
  isExpertVerified,
  hasValidation,
  getConfidenceLabel,
  getConfidenceColor,
  showFeedback,
  onFeedback,
}: QualityPopoverContentProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        {isExpertVerified ? (
          <Shield className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
        ) : (
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        )}
        <div>
          <p className="font-medium text-sm">
            {isExpertVerified ? "AI Verified Content" : "AI-Generated Content"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isExpertVerified 
              ? "This content has been automatically validated for accuracy." 
              : "This content was generated by AI and may contain errors."}
          </p>
        </div>
      </div>

      {hasValidation && typeof confidenceScore === 'number' && (
        <div className="bg-muted/50 rounded-md p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">Confidence Score</span>
            <span className={`text-sm font-bold ${getConfidenceColor(confidenceScore)}`}>
              {confidenceScore}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full transition-all ${
                confidenceScore >= 90 ? 'bg-green-500' :
                confidenceScore >= 75 ? 'bg-blue-500' :
                confidenceScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${confidenceScore}%` }}
            />
          </div>
          <p className={`text-xs mt-1 ${getConfidenceColor(confidenceScore)}`}>
            {getConfidenceLabel(confidenceScore)}
          </p>
        </div>
      )}

      {validationData?.overallFeedback && (
        <div className="text-xs text-muted-foreground border-t pt-2">
          <p className="line-clamp-2">{validationData.overallFeedback}</p>
        </div>
      )}

      {!hasValidation && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
          <span>This content was created before our validation system.</span>
        </div>
      )}

      {showFeedback && (
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full gap-1.5"
          onClick={onFeedback}
          data-testid="button-content-feedback"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Report Issue or Suggest Improvement
        </Button>
      )}
    </div>
  );
}
