import { motion } from "framer-motion";
import { Brain, Zap, Shield, BookOpen } from "lucide-react";

const features = [
  { icon: Brain, label: "AI-Powered Learning" },
  { icon: Zap, label: "Instant Explanations" },
  { icon: Shield, label: "Learn at Your Pace" },
  { icon: BookOpen, label: "First Principles Approach" },
];

export default function TrustIndicators() {
  return (
    <section className="py-16 border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-center gap-8 sm:gap-12"
        >
          {features.map((feature) => (
            <div key={feature.label} className="flex items-center gap-2 text-muted-foreground">
              <feature.icon className="h-5 w-5" />
              <span className="text-sm font-medium">{feature.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
