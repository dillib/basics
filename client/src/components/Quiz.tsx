import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// todo: remove mock functionality
const mockQuestions: QuizQuestion[] = [
  {
    id: "q1",
    question: "What is wave-particle duality?",
    options: [
      "Particles can only behave as waves",
      "Matter and energy exhibit both particle and wave behavior",
      "Waves can only behave as particles",
      "Energy has no particle properties",
    ],
    correctIndex: 1,
    explanation: "Wave-particle duality means that at the quantum level, matter and energy can behave both as particles and as waves, depending on how we observe them.",
  },
  {
    id: "q2",
    question: "What happens when we observe a quantum particle?",
    options: [
      "Nothing changes",
      "The particle disappears",
      "The superposition collapses into a single state",
      "The particle splits into two",
    ],
    correctIndex: 2,
    explanation: "Before observation, particles exist in a superposition of all possible states. Measurement causes this superposition to 'collapse' into one definite state.",
  },
  {
    id: "q3",
    question: "What is quantum entanglement?",
    options: [
      "Particles moving at the same speed",
      "Particles being in the same location",
      "Particles connected such that measuring one affects the other instantly",
      "Particles having identical colors",
    ],
    correctIndex: 2,
    explanation: "Entanglement is a quantum phenomenon where particles become correlated so that the state of one instantly influences the other, regardless of distance.",
  },
  {
    id: "q4",
    question: "Why are energy levels in atoms described as 'quantized'?",
    options: [
      "Energy flows continuously",
      "Energy comes in discrete packets or 'quanta'",
      "Atoms have unlimited energy",
      "Energy cannot be measured",
    ],
    correctIndex: 1,
    explanation: "Energy is quantized, meaning it comes in discrete units. Electrons in atoms can only exist at specific energy levels, jumping between them rather than moving smoothly.",
  },
];

interface QuizProps {
  onComplete?: () => void;
}

export default function Quiz({ onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const question = mockQuestions[currentQuestion];
  const progress = ((currentQuestion + (isAnswered ? 1 : 0)) / mockQuestions.length) * 100;

  const handleSelectAnswer = (index: number) => {
    if (isAnswered) return;
    
    setSelectedAnswer(index);
    setIsAnswered(true);
    
    if (index === question.correctIndex) {
      setScore((prev) => prev + 1);
    }
    
    console.log("Answer selected:", index, "Correct:", index === question.correctIndex);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < mockQuestions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
  };

  if (showResults) {
    const percentage = Math.round((score / mockQuestions.length) * 100);
    const isPassing = percentage >= 75;

    return (
      <Card className="border-card-border overflow-hidden">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className={`flex h-24 w-24 items-center justify-center rounded-full mx-auto mb-6 ${
              isPassing ? "bg-green-100 dark:bg-green-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"
            }`}
          >
            <span className="text-4xl font-bold">{percentage}%</span>
          </motion.div>
          
          <h3 className="text-2xl font-bold mb-2" data-testid="text-quiz-result">
            {isPassing ? "Excellent Work!" : "Good Effort!"}
          </h3>
          <p className="text-muted-foreground mb-6">
            You answered {score} out of {mockQuestions.length} questions correctly.
            {isPassing 
              ? " You've demonstrated a solid understanding of the first principles."
              : " Review the principles and try again to improve your score."
            }
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="outline" onClick={handleRestart} data-testid="button-restart-quiz">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={onComplete} data-testid="button-continue-learning">
              Continue Learning
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-card-border overflow-hidden">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {mockQuestions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-6" data-testid="text-quiz-question">
              {question.question}
            </h3>

            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctIndex;
                const showCorrect = isAnswered && isCorrect;
                const showIncorrect = isAnswered && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={isAnswered}
                    className={`flex items-center gap-3 w-full text-left p-4 rounded-lg border transition-all ${
                      showCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : showIncorrect
                        ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                        : isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover-elevate"
                    } ${isAnswered ? "cursor-default" : "cursor-pointer"}`}
                    data-testid={`button-option-${index}`}
                  >
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      showCorrect
                        ? "border-green-500 bg-green-500 text-white"
                        : showIncorrect
                        ? "border-red-500 bg-red-500 text-white"
                        : isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30"
                    }`}>
                      {showCorrect ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : showIncorrect ? (
                        <XCircle className="h-4 w-4" />
                      ) : (
                        <span className="text-xs font-medium">{String.fromCharCode(65 + index)}</span>
                      )}
                    </div>
                    <span className={`text-sm ${showCorrect || showIncorrect ? "font-medium" : ""}`}>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>

            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg mb-6 ${
                  selectedAnswer === question.correctIndex
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {selectedAnswer === question.correctIndex ? "Correct!" : "Not quite right"}
                </p>
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              </motion.div>
            )}

            {isAnswered && (
              <Button onClick={handleNextQuestion} className="w-full" data-testid="button-next-question">
                {currentQuestion < mockQuestions.length - 1 ? "Next Question" : "See Results"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
