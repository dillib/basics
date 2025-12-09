import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Brain, 
  Target, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Lightbulb,
  BookOpen,
  BarChart3,
  RotateCcw,
  MessageSquare,
  Layers,
  Zap,
  GraduationCap,
  Clock,
  Award
} from "lucide-react";
import Footer from "@/components/Footer";

const problemPoints = [
  {
    icon: Brain,
    title: "Information Overload",
    description: "AI chatbots dump walls of text that overwhelm rather than teach. You get answers, but not understanding.",
  },
  {
    icon: Layers,
    title: "No Structure",
    description: "Random facts without a logical learning path. You're left connecting dots that should already be connected.",
  },
  {
    icon: RotateCcw,
    title: "No Retention",
    description: "Chat history disappears. No quizzes, no progress tracking. By next week, you've forgotten everything.",
  },
];

const solutionPoints = [
  {
    icon: Target,
    title: "First Principles Approach",
    description: "We break down any topic into its fundamental truths, then build understanding layer by layer. You don't just learn what—you understand why.",
  },
  {
    icon: BookOpen,
    title: "Structured Curriculum",
    description: "Every topic becomes a clear learning path: introduction, core principles, visual diagrams, real-world analogies, and assessment.",
  },
  {
    icon: BarChart3,
    title: "Progress You Can Measure",
    description: "Track mastery across topics, review quiz scores, and see exactly what you've learned. Your knowledge grows visibly.",
  },
  {
    icon: RotateCcw,
    title: "Spaced Repetition",
    description: "Our review system brings back concepts just before you forget them. Build knowledge that actually sticks.",
  },
  {
    icon: MessageSquare,
    title: "Contextual AI Tutor",
    description: "Ask questions within the context of what you're learning. The AI knows your topic and adapts explanations to your level.",
  },
  {
    icon: Lightbulb,
    title: "Real-World Analogies",
    description: "Every principle comes with relatable examples. Complex ideas become intuitive through connections you already understand.",
  },
];

const comparisonData = [
  { feature: "Structured learning path", basicstutor: true, chatbots: false },
  { feature: "First principles breakdown", basicstutor: true, chatbots: false },
  { feature: "Progress tracking", basicstutor: true, chatbots: false },
  { feature: "Quizzes & assessments", basicstutor: true, chatbots: false },
  { feature: "Spaced repetition review", basicstutor: true, chatbots: false },
  { feature: "Visual diagrams", basicstutor: true, chatbots: false },
  { feature: "Real-world analogies", basicstutor: true, chatbots: "Sometimes" },
  { feature: "Contextual AI tutor", basicstutor: true, chatbots: "Limited" },
  { feature: "Saved learning history", basicstutor: true, chatbots: "Partial" },
  { feature: "Any topic generation", basicstutor: true, chatbots: true },
];

const testimonialQuotes = [
  {
    quote: "I finally understand quantum physics. Not because I memorized facts, but because BasicsTutor showed me the underlying principles.",
    author: "Physics Student",
  },
  {
    quote: "ChatGPT gave me information. BasicsTutor gave me understanding. There's a huge difference.",
    author: "Self-Learner",
  },
  {
    quote: "The quizzes and progress tracking keep me accountable. I'm actually retaining what I learn now.",
    author: "Career Changer",
  },
];

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              Why BasicsTutor?
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6" data-testid="text-why-title">
              ChatGPT tells you things.<br />
              <span className="text-primary">BasicsTutor teaches you things.</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto mb-10">
              AI chatbots are amazing for quick answers. But if you want to truly understand a subject—to build 
              knowledge that lasts—you need more than a conversation. You need a learning experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/topics">
                <Button size="lg" className="rounded-full px-8" data-testid="button-try-free">
                  Try a Free Topic
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="rounded-full px-8" data-testid="button-view-pricing">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                The Problem with AI Chatbots for Learning
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                ChatGPT, Gemini, and Perplexity are incredible tools. But they weren't designed to teach.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {problemPoints.map((point) => (
                <Card key={point.title} className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-6">
                      <point.icon className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                How BasicsTutor is Different
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We built BasicsTutor specifically for learning—not just answering questions.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {solutionPoints.map((point) => (
                <Card key={point.title} className="hover-elevate">
                  <CardContent className="p-8">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                      <point.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{point.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{point.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                Side-by-Side Comparison
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                See exactly how BasicsTutor stacks up against general AI chatbots for learning.
              </p>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">
                        <div className="flex items-center justify-center gap-2">
                          <GraduationCap className="h-5 w-5 text-primary" />
                          BasicsTutor
                        </div>
                      </th>
                      <th className="text-center p-4 font-semibold text-muted-foreground">
                        AI Chatbots
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, index) => (
                      <tr key={row.feature} className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                        <td className="p-4 font-medium">{row.feature}</td>
                        <td className="p-4 text-center">
                          {row.basicstutor === true ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground">{row.basicstutor}</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {row.chatbots === true ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                          ) : row.chatbots === false ? (
                            <XCircle className="h-5 w-5 text-muted-foreground/50 mx-auto" />
                          ) : (
                            <span className="text-muted-foreground text-sm">{row.chatbots}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                The Learning Experience
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Here's what happens when you learn a topic on BasicsTutor.
              </p>
            </div>

            <div className="space-y-6">
              {[
                {
                  step: "1",
                  title: "Enter Any Topic",
                  description: "Type what you want to learn—from 'quantum computing' to 'how bread rises'. Our AI gets to work.",
                  icon: Zap,
                },
                {
                  step: "2",
                  title: "Receive Structured Principles",
                  description: "Get 4-6 fundamental principles, ordered from basic to advanced. Each builds on the last.",
                  icon: Layers,
                },
                {
                  step: "3",
                  title: "Learn with Analogies",
                  description: "Every principle includes real-world examples that make abstract concepts click.",
                  icon: Lightbulb,
                },
                {
                  step: "4",
                  title: "Test Your Understanding",
                  description: "Take a quiz to verify you truly understood. Get explanations for every answer.",
                  icon: Award,
                },
                {
                  step: "5",
                  title: "Track & Review",
                  description: "See your progress on the dashboard. Review topics with spaced repetition to make knowledge stick.",
                  icon: TrendingUp,
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-6 items-start">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                    {item.step}
                  </div>
                  <div className="flex-1 pt-2">
                    <h3 className="text-xl font-semibold mb-2 flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-primary" />
                      {item.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-card border-y border-border">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                What Learners Say
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonialQuotes.map((item, index) => (
                <Card key={index} className="hover-elevate">
                  <CardContent className="p-8">
                    <p className="text-lg leading-relaxed mb-6 italic">"{item.quote}"</p>
                    <p className="text-sm text-muted-foreground font-medium">— {item.author}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-32">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-8">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-6">
              Ready to Actually Learn Something?
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Stop getting answers. Start building understanding. Try a free sample topic 
              and experience the difference first-principles learning makes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/topics">
                <Button size="lg" className="rounded-full px-8" data-testid="button-start-learning">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Start Learning Free
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="rounded-full px-8" data-testid="button-see-plans">
                  See Plans & Pricing
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              <Clock className="h-4 w-4 inline mr-1" />
              Sample topics are completely free. No account required.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
