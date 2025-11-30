import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Layers, Target, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: Lightbulb,
    title: "Break Down to Fundamentals",
    description: "Our AI identifies the core principles that form the foundation of any topic, eliminating assumptions and jargon.",
  },
  {
    icon: Layers,
    title: "Build Up Step by Step",
    description: "Each concept builds on the previous one with clear explanations, real-world analogies, and visual diagrams.",
  },
  {
    icon: Target,
    title: "Test Your Understanding",
    description: "Interactive quizzes with instant feedback ensure you truly grasp each principle before moving forward.",
  },
  {
    icon: TrendingUp,
    title: "Track Your Progress",
    description: "Personalized learning paths adapt to your performance, suggesting next steps based on your mastery.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 sm:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-how-it-works-title">
            How It Works
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Our method is inspired by how the world's greatest thinkers approach learning—by questioning everything and building from the ground up.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card 
              key={step.title} 
              className="relative overflow-visible border-card-border"
              data-testid={`card-step-${index + 1}`}
            >
              <div className="absolute -top-4 left-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-lg">
                  {index + 1}
                </div>
              </div>
              <CardContent className="pt-10 pb-6">
                <step.icon className="h-8 w-8 text-primary mb-4" />
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
