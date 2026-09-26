import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HeroField from "./HeroField";

export default function CTASection() {
  const [, setLocation] = useLocation();
  return (
    <section className="py-32 sm:py-40 bg-background relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        {/* Bookends the page: the same living field as the hero. */}
        <HeroField />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-primary/5 via-brand-accent/5 to-primary/5 rounded-full blur-3xl" />
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
            Your classroom reference library.
            <span className="block text-primary">Built on first principles.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Look up any topic, download printable reference sheets, and build 
            deep understanding — whether you're teaching or learning.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="rounded-full px-8 h-14 text-lg"
              onClick={() => {
                setLocation("/topics");
                window.scrollTo(0, 0);
              }}
              data-testid="button-cta-get-started"
            >
              Browse topic library
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-sm text-muted-foreground">
              Free sample topics available
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
