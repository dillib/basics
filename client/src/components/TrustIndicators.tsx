import { motion } from "framer-motion";

export default function TrustIndicators() {
  return (
    <section className="py-16 border-y border-border/50 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm text-muted-foreground mb-8">
            Trusted by learners from leading institutions
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16 opacity-50">
            {["Stanford", "MIT", "Harvard", "Google", "Meta"].map((name) => (
              <span key={name} className="text-lg sm:text-xl font-semibold text-muted-foreground/80">
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
