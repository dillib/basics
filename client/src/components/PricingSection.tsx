import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

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
    name: "Free",
    price: "$0",
    period: "",
    description: "Try one complete topic",
    features: [
      "1 complete learning path",
      "First principles breakdowns",
      "Interactive quizzes",
      "Basic progress tracking",
    ],
    buttonText: "Get started",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/month",
    description: "Unlimited learning for curious minds",
    features: [
      "Unlimited topic access",
      "AI-generated visual diagrams",
      "Advanced quiz analytics",
      "Personalized learning paths",
      "Cross-device sync",
      "Priority support",
    ],
    highlighted: true,
    buttonText: "Start free trial",
  },
];

interface PricingSectionProps {
  onSelectPlan?: (planId: string) => void;
}

export default function PricingSection({ onSelectPlan }: PricingSectionProps) {
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
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                className={`relative rounded-3xl p-10 sm:p-12 h-full transition-all duration-300 ${
                  tier.highlighted
                    ? "bg-gradient-to-br from-primary via-purple-600 to-violet-600 text-white shadow-2xl shadow-primary/20"
                    : "bg-card border border-border/50"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-foreground text-background text-sm font-medium px-4 py-1.5 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className={`text-xl font-medium mb-2 ${tier.highlighted ? "text-white/90" : ""}`}>
                    {tier.name}
                  </h3>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-5xl font-semibold">{tier.price}</span>
                    <span className={tier.highlighted ? "text-white/70" : "text-muted-foreground"}>
                      {tier.period}
                    </span>
                  </div>
                  <p className={tier.highlighted ? "text-white/70" : "text-muted-foreground"}>
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-10">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`mt-0.5 rounded-full p-1 ${
                        tier.highlighted ? "bg-white/20" : "bg-primary/10"
                      }`}>
                        <Check className={`h-3 w-3 ${tier.highlighted ? "text-white" : "text-primary"}`} />
                      </div>
                      <span className={tier.highlighted ? "text-white/90" : "text-muted-foreground"}>
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
                  onClick={() => {
                    console.log("Plan selected:", tier.id);
                    onSelectPlan?.(tier.id);
                  }}
                  data-testid={`button-select-${tier.id}`}
                >
                  {tier.buttonText}
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
