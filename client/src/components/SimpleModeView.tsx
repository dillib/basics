import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  BookOpen, 
  MessageCircle, 
  Sparkles,
  ChevronRight,
  Lightbulb,
  HelpCircle
} from "lucide-react";
import TutorChat from "./TutorChat";
import ConceptVisual from "./visuals/ConceptVisual";
import type { Principle } from "@shared/schema";

interface SimpleModeViewProps {
  topicTitle: string;
  topicDescription: string;
  topicId: string;
  principles: Principle[];
  /** Whether the current user is allowed to use the AI Tutor right now
   * (signed in, and Pro if monetization is enabled). */
  canUseTutor: boolean;
  isAuthenticated: boolean;
}

export default function SimpleModeView({
  topicTitle,
  topicDescription,
  topicId,
  principles,
  canUseTutor,
  isAuthenticated,
}: SimpleModeViewProps) {
  const [selectedPrinciple, setSelectedPrinciple] = useState<Principle | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<{ principleId?: string; principleTitle?: string }>({});

  const handleAskAI = (principle?: Principle) => {
    if (!canUseTutor) {
      // Not signed in (or, once monetization is on, not Pro) — send them to
      // sign in rather than opening a chat that will just fail server-side.
      if (!isAuthenticated) {
        sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
        window.location.href = "/api/login";
      } else {
        window.location.href = "/pricing";
      }
      return;
    }
    if (principle) {
      setChatContext({ principleId: principle.id, principleTitle: principle.title });
    } else {
      setChatContext({});
    }
    setIsChatOpen(true);
  };

  // Generate a simple summary for each principle
  const getSimpleSummary = (principle: Principle) => {
    // Take first sentence or first 150 chars of explanation
    const firstSentence = principle.explanation?.split('.')[0] + '.' || principle.explanation?.slice(0, 150) + '...' || '';
    return firstSentence;
  };

  return (
    <div className="space-y-6">
      {/* The page header above already shows the title and description;
          this used to repeat both. Keep only the tutor entry point. */}
      <button
        onClick={() => handleAskAI()}
        className="flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-testid="button-ask-ai-topic"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-primary" />
        <span className="flex-1">
          <span className="font-medium">Stuck on something?</span>{" "}
          <span className="text-muted-foreground">Ask Basics Tutor about {topicTitle}.</span>
        </span>
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Quick Principles List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            Key Points ({principles.length})
          </h3>
          <Badge variant="secondary" className="text-xs">
            Click "Ask Basics Tutor" for details
          </Badge>
        </div>

        {principles.map((principle, index) => (
          <Card
            key={principle.id}
            className="card-glow group cursor-pointer"
            onClick={() => setSelectedPrinciple(selectedPrinciple?.id === principle.id ? null : principle)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-base mb-1 group-hover:text-primary transition-colors">
                    {principle.title}
                  </h4>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {getSimpleSummary(principle)}
                  </p>

                  {/* Visual-first: every principle leads with its animated
                      scene, no click needed. Clicks inside (Replay) must not
                      toggle the card. */}
                  <div className="mt-3 cursor-default" onClick={(e) => e.stopPropagation()}>
                    <ConceptVisual principleId={principle.id} />
                  </div>

                  {selectedPrinciple?.id === principle.id && (
                    <div
                      className="mt-3 pt-3 border-t space-y-3 animate-in slide-in-from-top-2 cursor-default"
                      // Replay / scene clicks shouldn't collapse the card.
                      onClick={(e) => e.stopPropagation()}
                    >
                      {principle.analogy && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
                          <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">
                            💡 Analogy
                          </p>
                          <p className="text-sm text-amber-800 dark:text-amber-300">
                            {principle.analogy}
                          </p>
                        </div>
                      )}

                      {principle.keyTakeaways && principle.keyTakeaways.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-2">
                            Key Takeaways:
                          </p>
                          <ul className="space-y-1.5">
                            {principle.keyTakeaways.slice(0, 3).map((takeaway, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-primary flex-shrink-0" />
                                {takeaway}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAskAI(principle);
                        }}
                        className="w-full gap-2 text-sm"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Ask Basics Tutor about "{principle.title}"
                      </Button>
                    </div>
                  )}
                </div>
                <ChevronRight 
                  className={`w-5 h-5 text-muted-foreground transition-transform ${
                    selectedPrinciple?.id === principle.id ? 'rotate-90' : ''
                  }`} 
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Chat Dialog */}
      <TutorChat
        topicId={topicId}
        topicTitle={topicTitle}
        principleId={chatContext.principleId}
        principleTitle={chatContext.principleTitle}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </div>
  );
}
