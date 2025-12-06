import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

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

const pricingTiers: PricingTier[] = [
  {
    id: "pay-per-topic",
    name: "Pay Per Topic",
    price: "$1.99",
    period: "/topic",
    description: "Unlock topics as you need them",
    features: [
      "Pay only for what you learn",
      "First principles breakdowns",
      "Interactive quizzes",
      "Progress tracking",
      "Lifetime access to purchased topics",
    ],
    buttonText: "Browse topics",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$99",
    period: "/year",
    description: "Unlimited learning with AI-powered tools",
    features: [
      "Unlimited topic access for 1 year",
      "AI Tutor Chat for personalized help",
      "Quiz Performance Analytics",
      "Spaced Repetition Review System",
      "All principles and quizzes unlocked",
      "Priority access to new features",
    ],
    highlighted: true,
    buttonText: "Get Pro for $99/year",
  },
];

interface PricingSectionProps {
  onSelectPlan?: (planId: string) => void;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const proCheckoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/checkout/pro');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const handlePlanSelect = (planId: string) => {
    if (planId === "pay-per-topic") {
      setLocation("/");
      return;
    }

    if (planId === "pro") {
      if (!isAuthenticated) {
        window.location.href = "/api/login";
        return;
      }
      proCheckoutMutation.mutate();
      return;
    }

    onSelectPlan?.(planId);
  };

  return (
    <section className="py-32 sm:py-40 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6" data-testid="text-pricing-title">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Try sample topics free. Pick the plan that works for you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              data-testid={`card-pricing-${tier.id}`}
            >
              <div 
                className={`relative rounded-3xl p-8 sm:p-10 h-full transition-all duration-300 ${
                  tier.highlighted
                    ? "bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white shadow-2xl shadow-indigo-500/20"
                    : "bg-card border border-border/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-foreground text-background text-sm font-medium px-4 py-1.5 rounded-full">
                      Best value
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-xl font-medium mb-2 ${tier.highlighted ? "text-white/90" : ""}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-semibold">{tier.price}</span>
                    <span className={tier.highlighted ? "text-white/70" : "text-muted-foreground"}>
                      {tier.period}
                    </span>
                  </div>
                  <p className={tier.highlighted ? "text-white/70" : "text-muted-foreground"}>
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-1 ${
                        tier.highlighted ? "bg-white/20" : "bg-primary/10"
                      }`}>
                        <Check className={`h-3 w-3 ${tier.highlighted ? "text-white" : "text-primary"}`} />
                      </div>
                      <span className={`text-sm ${tier.highlighted ? "text-white/90" : "text-muted-foreground"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  className={`w-full rounded-full ${
                    tier.highlighted
                      ? "bg-white text-primary hover:bg-white/90"
                      : ""
                  }`}
                  variant={tier.highlighted ? "secondary" : "outline"}
                  onClick={() => handlePlanSelect(tier.id)}
                  disabled={tier.id === "pro" && proCheckoutMutation.isPending}
                  data-testid={`button-select-${tier.id}`}
                >
                  {tier.id === "pro" && proCheckoutMutation.isPending ? "Loading..." : tier.buttonText}
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          Need something custom?{" "}
          <a href="/contact" className="text-primary hover:underline">
            Contact us for enterprise pricing
          </a>
        </motion.p>
      </div>
    </section>
  );
}
