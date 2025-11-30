import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";

interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  userAnswer?: number | null;
  isCorrect?: boolean | null;
}

interface QuizData {
  quiz: {
    id: string;
    topicId: string;
    totalQuestions: number;
  };
  questions: QuizQuestion[];
}

interface QuizProps {
  topicId?: string;
  topicTitle?: string;
  onComplete?: () => void;
}

export default function Quiz({ topicId, topicTitle, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentExplanation, setCurrentExplanation] = useState<string>("");

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/topics/${topicId}/quiz`);
      return response.json();
    },
    onSuccess: (data: QuizData) => {
      setQuizData(data);
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: number }) => {
      const response = await apiRequest("POST", `/api/quiz/${quizData?.quiz.id}/answer`, {
        questionId,
        answer,
      });
      return response.json();
    },
  });

  const completeQuizMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/quiz/${quizData?.quiz.id}/complete`);
      return response.json();
    },
  });

  useEffect(() => {
    if (topicId) {
      createQuizMutation.mutate();
    }
  }, [topicId]);

  const questions = quizData?.questions || [];
  const question = questions[currentQuestion];
  const progress = questions.length > 0 
    ? ((currentQuestion + (isAnswered ? 1 : 0)) / questions.length) * 100
    : 0;

  const handleSelectAnswer = async (index: number) => {
    if (isAnswered || !question) return;
    
    setSelectedAnswer(index);
    setIsAnswered(true);
    
    try {
      const result = await submitAnswerMutation.mutateAsync({
        questionId: question.id,
        answer: index,
      });
      
      if (result.isCorrect) {
        setScore((prev) => prev + 1);
      }
      setCurrentExplanation(result.explanation || question.explanation || "");
    } catch (error) {
      console.error("Error submitting answer:", error);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
      setCurrentExplanation("");
    } else {
      try {
        await completeQuizMutation.mutateAsync();
      } catch (error) {
        console.error("Error completing quiz:", error);
      }
      setShowResults(true);
    }
  };

  const handleRestart = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setShowResults(false);
    setCurrentExplanation("");
    setQuizData(null);
    createQuizMutation.mutate();
  };

  if (createQuizMutation.isPending) {
    return (
      <Card className="border-card-border overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div>
              <p className="font-medium">Generating Quiz...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Creating personalized questions for {topicTitle || "this topic"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (createQuizMutation.isError) {
    return (
      <Card className="border-card-border overflow-hidden">
        <CardContent className="p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-4">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Could not load quiz</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Please sign in to take quizzes, or try again later.
          </p>
          <Button variant="outline" onClick={() => createQuizMutation.mutate()}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!question) {
    return (
      <Card className="border-card-border overflow-hidden">
        <CardContent className="p-8">
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (showResults) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassing = percentage >= 70;

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
            You answered {score} out of {questions.length} questions correctly.
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

  const correctAnswer = question.correctAnswer;

  return (
    <Card className="border-card-border overflow-hidden">
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
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
              {question.questionText}
            </h3>

            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrect = index === correctAnswer;
                const showCorrect = isAnswered && isCorrect;
                const showIncorrect = isAnswered && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectAnswer(index)}
                    disabled={isAnswered || submitAnswerMutation.isPending}
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
                  selectedAnswer === correctAnswer
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                }`}
              >
                <p className="text-sm font-medium mb-1">
                  {selectedAnswer === correctAnswer ? "Correct!" : "Not quite right"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentExplanation || question.explanation}
                </p>
              </motion.div>
            )}

            {isAnswered && (
              <Button onClick={handleNextQuestion} className="w-full" data-testid="button-next-question">
                {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
