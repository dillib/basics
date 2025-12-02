import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface CTASectionProps {
  onGetStarted?: () => void;
}

export default function CTASection({ onGetStarted }: CTASectionProps) {
  return (
    <section className="py-32 sm:py-40 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
            Ready to build real understanding?
            <span className="block text-primary">Start learning from first principles</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Create your first topic and begin your AI-powered learning journey. 
            Explore the fundamentals at your own pace. No credit card required.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-lg"
              onClick={() => {
                console.log("CTA clicked");
                onGetStarted?.();
              }}
              data-testid="button-cta-get-started"
            >
              Get started for free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Join 50,000+ learners
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
