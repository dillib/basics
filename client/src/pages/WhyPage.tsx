import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import PageHero from "@/components/PageHero";
import { ConceptVisualView } from "@/components/visuals/ConceptVisual";
import { parseVisualSpec } from "@shared/visuals";

// Icon tile hues for the "different" cards, from the category palette.
const FEATURE_HUES = [216, 36, 142, 290, 174, 8];

// The method itself, drawn with the same scene renderer lessons use.
const METHOD_SCENE = parseVisualSpec({
  kind: "layers",
  caption: "Every lesson is built the same way: foundation first, each layer resting on the one below.",
  layers: [
    { label: "Strip it to fundamentals", detail: "What must be true for this to work?" },
    { label: "Rebuild principle by principle", detail: "Each idea derived, not just stated" },
    { label: "See each idea in motion", detail: "A live visual for every principle" },
    { label: "Test it, then review it", detail: "Quizzes and spaced review make it stick" },
  ],
})!;

const METHOD_STEPS = [
  { title: "Strip it to fundamentals", body: "We start from what must be true — the handful of facts everything else rests on." },
  { title: "Rebuild principle by principle", body: "Each principle is derived from the ones before it, with a precise analogy that maps part-to-part." },
  { title: "See each idea in motion", body: "Every principle gets a live visual: a simulation, a process, a feedback loop." },
  { title: "Test it, then review it", body: "A quiz checks real understanding, and spaced review brings ideas back before you forget." },
];

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

export default function WhyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="The Method"
        titleTestId="text-why-title"
        title={<>AI gives you answers.<br /><span className="text-brand-gradient">BasicsTutor gives you understanding.</span></>}
        subtitle="AI chatbots are amazing for quick answers. But if you want to truly understand a subject—to build knowledge that lasts—you need more than a conversation. You need a learning experience."
      >
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
      </PageHero>

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
                // Neutral card; only the icon carries the "problem" red. A fully
                // pink card read as off-brand, not as a warning.
                <Card key={point.title} className="border-card-border bg-background">
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
              {solutionPoints.map((point, i) => (
                <Card key={point.title} className="card-hover">
                  <CardContent className="p-8">
                    {/* Distinct field hues (same system as topic covers) instead of six identical teal tiles. */}
                    <div
                      className="h-12 w-12 rounded-xl flex items-center justify-center mb-6"
                      style={{ background: `hsl(${FEATURE_HUES[i % FEATURE_HUES.length]} 70% 50% / 0.12)`, color: `hsl(${FEATURE_HUES[i % FEATURE_HUES.length]} 65% 46%)` }}
                    >
                      <point.icon className="h-6 w-6" />
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

      {/* Replaces an invented "What Learners Say" section: the method shown,
          not testimonials we can't attribute to real people. */}
      <section className="py-20 bg-card border-y border-border" aria-labelledby="method-title">
        <div className="container mx-auto px-6">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">The method, in motion</p>
              <h2 id="method-title" className="text-3xl sm:text-4xl font-semibold tracking-tight [text-wrap:balance]">
                Every lesson is built from the ground up
              </h2>
              <ol className="mt-8 space-y-6">
                {METHOD_STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold tabular-nums text-primary-foreground">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="mt-1 text-muted-foreground leading-relaxed">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <ConceptVisualView spec={METHOD_SCENE} />
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
