import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles } from "lucide-react";

interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  buttonText: string;
}

// todo: remove mock functionality
const pricingTiers: PricingTier[] = [
  {
    id: "free",
    name: "Explorer",
    price: "Free",
    period: "",
    description: "Try one topic completely free",
    features: [
      "1 complete topic learning path",
      "All first principles breakdowns",
      "Interactive quizzes",
      "Basic progress tracking",
    ],
    buttonText: "Start Free",
  },
  {
    id: "pro",
    name: "Pro Learner",
    price: "$9.99",
    period: "/month",
    description: "Unlimited access to all topics",
    features: [
      "Unlimited topic access",
      "AI-generated visual diagrams",
      "Advanced quiz analytics",
      "Personalized learning paths",
      "Progress across devices",
      "Priority AI responses",
      "Community forum access",
    ],
    highlighted: true,
    buttonText: "Start 7-Day Free Trial",
  },
  {
    id: "topic",
    name: "Pay Per Topic",
    price: "$1.99",
    period: "/topic",
    description: "One-time purchase per topic",
    features: [
      "Permanent access to topic",
      "All first principles breakdowns",
      "Interactive quizzes",
      "Topic-specific diagrams",
      "No subscription required",
    ],
    buttonText: "Browse Topics",
  },
];

interface PricingSectionProps {
  onSelectPlan?: (planId: string) => void;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (planId: string) => {
    console.log("Plan selected:", planId);
    setSelectedPlan(planId);
    onSelectPlan?.(planId);
  };

  return (
    <section className="py-16 sm:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-pricing-title">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start free, upgrade when you're ready. No hidden fees, cancel anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative ${
                tier.highlighted 
                  ? "border-primary shadow-lg scale-105 z-10" 
                  : "border-card-border"
              }`}
              data-testid={`card-pricing-${tier.id}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground shadow-md">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full mt-6"
                  variant={tier.highlighted ? "default" : "outline"}
                  onClick={() => handleSelectPlan(tier.id)}
                  data-testid={`button-select-${tier.id}`}
                >
                  {tier.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
