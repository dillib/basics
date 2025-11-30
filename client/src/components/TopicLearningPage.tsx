import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Lightbulb, 
  CheckCircle2, 
  ChevronDown,
  ChevronRight,
  Clock,
  BookmarkPlus,
  Share2,
  Volume2,
  VolumeX,
  ArrowRight
} from "lucide-react";
import Quiz from "./Quiz";

interface Principle {
  id: string;
  number: number;
  title: string;
  content: string;
  analogy: string;
}

interface TopicData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedTime: string;
  progress: number;
  principles: Principle[];
  relatedTopics: { id: string; title: string; category: string }[];
}

// todo: remove mock functionality
const mockTopicData: TopicData = {
  id: "quantum-mechanics",
  title: "Quantum Mechanics",
  description: "Understanding the fundamental nature of matter and energy at the smallest scales.",
  category: "Physics",
  difficulty: "Intermediate",
  estimatedTime: "4 hours",
  progress: 35,
  principles: [
    {
      id: "p1",
      number: 1,
      title: "Everything is made of particles and waves",
      content: "At the quantum level, matter and energy exhibit both particle-like and wave-like behavior. This is known as wave-particle duality. Light, for example, can behave as a stream of particles (photons) or as a wave, depending on how we observe it.",
      analogy: "Think of it like water in a bathtub. Individual water molecules (particles) create ripples (waves). At the quantum scale, everything is like that water—both distinct 'pieces' and continuous 'ripples' simultaneously.",
    },
    {
      id: "p2",
      number: 2,
      title: "Observation changes the outcome",
      content: "In quantum mechanics, the act of measuring or observing a particle actually affects its behavior. Before measurement, particles exist in a 'superposition' of all possible states. Measurement 'collapses' this superposition into a single definite state.",
      analogy: "Imagine a coin spinning in the air. While spinning, it's neither heads nor tails—it's both possibilities at once. Only when you catch it and look does it 'choose' to be one or the other. Quantum particles work similarly.",
    },
    {
      id: "p3",
      number: 3,
      title: "Particles can be connected across distances",
      content: "Quantum entanglement allows particles to be correlated in ways that seem to defy classical physics. When two particles are entangled, measuring one instantly affects the other, regardless of the distance between them.",
      analogy: "Picture two magical dice that are somehow connected. No matter how far apart they are, when you roll one and get a 6, the other instantly becomes a 1. They're not communicating—they're fundamentally linked.",
    },
    {
      id: "p4",
      number: 4,
      title: "Energy comes in discrete packets",
      content: "Energy is not continuous but comes in discrete units called 'quanta' (singular: quantum). This is why atoms can only exist at specific energy levels and why electrons jump between these levels rather than moving smoothly.",
      analogy: "Think of a staircase versus a ramp. On a ramp, you can stand at any height. On stairs, you can only stand at specific heights (each step). Energy levels in atoms work like stairs—you can only be at certain 'steps.'",
    },
  ],
  relatedTopics: [
    { id: "1", title: "Special Relativity", category: "Physics" },
    { id: "2", title: "Particle Physics", category: "Physics" },
    { id: "3", title: "Quantum Computing", category: "Technology" },
  ],
};

interface TopicLearningPageProps {
  topicId?: string;
}

export default function TopicLearningPage({ topicId }: TopicLearningPageProps) {
  const [expandedPrinciples, setExpandedPrinciples] = useState<Set<string>>(new Set(["p1"]));
  const [completedPrinciples, setCompletedPrinciples] = useState<Set<string>>(new Set());
  const [showQuiz, setShowQuiz] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);

  const topic = mockTopicData;

  const togglePrinciple = (id: string) => {
    setExpandedPrinciples((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const markComplete = (id: string) => {
    setCompletedPrinciples((prev) => new Set(Array.from(prev).concat(id)));
    console.log("Marked principle complete:", id);
  };

  const toggleNarration = () => {
    setIsNarrating(!isNarrating);
    console.log("Narration toggled:", !isNarrating);
    // todo: implement Web Speech API narration
  };

  const calculatedProgress = Math.round((completedPrinciples.size / topic.principles.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between gap-4 h-14">
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant="secondary" className="shrink-0">{topic.category}</Badge>
              <Separator orientation="vertical" className="h-4" />
              <span className="text-sm font-medium truncate">{topic.title}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{topic.estimatedTime}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={calculatedProgress} className="w-24 h-2" />
                <span className="text-sm font-medium" data-testid="text-progress">{calculatedProgress}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleNarration} data-testid="button-narration">
                  {isNarrating ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-bookmark">
                  <BookmarkPlus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" data-testid="button-share">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <main className="flex-1 max-w-3xl">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-topic-title">{topic.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{topic.description}</p>
              <div className="flex flex-wrap items-center gap-4">
                <Badge>{topic.difficulty}</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{topic.estimatedTime} to complete</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">First Principles</h2>
              </div>

              {topic.principles.map((principle) => {
                const isExpanded = expandedPrinciples.has(principle.id);
                const isComplete = completedPrinciples.has(principle.id);

                return (
                  <Card 
                    key={principle.id}
                    className={`border-card-border transition-all ${isComplete ? "border-l-4 border-l-primary" : ""}`}
                    data-testid={`card-principle-${principle.number}`}
                  >
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => togglePrinciple(principle.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isComplete ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <span className="text-sm font-bold">{principle.number}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {principle.title}
                          </CardTitle>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                      </div>
                    </CardHeader>
                    
                    {isExpanded && (
                      <CardContent className="pt-0 space-y-6">
                        <div className="pl-12">
                          <p className="text-muted-foreground leading-relaxed mb-4">
                            {principle.content}
                          </p>
                          
                          <div className="bg-accent/50 rounded-lg p-4 border border-accent">
                            <div className="flex items-start gap-2">
                              <span className="text-xl">💡</span>
                              <div>
                                <p className="text-sm font-medium mb-1">Real-World Analogy</p>
                                <p className="text-sm text-muted-foreground">{principle.analogy}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {!isComplete && (
                          <div className="pl-12">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                markComplete(principle.id);
                              }}
                              data-testid={`button-complete-${principle.number}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Mark as Understood
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Test Your Understanding</h2>
                </div>
              </div>
              
              {showQuiz ? (
                <Quiz onComplete={() => setShowQuiz(false)} />
              ) : (
                <Card className="border-card-border">
                  <CardContent className="p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Ready to test your knowledge?</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                      Answer interactive questions to reinforce what you've learned about the first principles.
                    </p>
                    <Button onClick={() => setShowQuiz(true)} data-testid="button-start-quiz">
                      Start Quiz
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>

          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-20">
              <Card className="border-card-border">
                <CardHeader>
                  <CardTitle className="text-base">Table of Contents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <nav className="space-y-2">
                      {topic.principles.map((principle) => {
                        const isComplete = completedPrinciples.has(principle.id);
                        return (
                          <button
                            key={principle.id}
                            onClick={() => {
                              setExpandedPrinciples((prev) => new Set(Array.from(prev).concat(principle.id)));
                            }}
                            className={`flex items-center gap-2 w-full text-left text-sm p-2 rounded-md hover-elevate ${
                              isComplete ? "text-primary" : "text-muted-foreground"
                            }`}
                            data-testid={`toc-principle-${principle.number}`}
                          >
                            {isComplete ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border border-current shrink-0" />
                            )}
                            <span className="truncate">{principle.title}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="border-card-border mt-4">
                <CardHeader>
                  <CardTitle className="text-base">Continue Learning</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topic.relatedTopics.map((related) => (
                    <button
                      key={related.id}
                      className="flex items-center justify-between w-full text-left p-2 rounded-md hover-elevate"
                      onClick={() => console.log("Navigate to topic:", related.id)}
                      data-testid={`button-related-${related.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">{related.title}</p>
                        <p className="text-xs text-muted-foreground">{related.category}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
