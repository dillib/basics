import type { ReactNode } from "react";
import { motion } from "framer-motion";
import HeroField from "./HeroField";

/**
 * Shared hero for secondary pages (Method, Help, Contact, Support, legal).
 * Carries the brand identity -- living constellation field, teal/amber
 * glows -- so these pages read as the same site as the homepage instead
 * of a stock template.
 */
export default function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
  compact = false,
  titleTestId,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Shorter band for utility/legal pages. */
  compact?: boolean;
  titleTestId?: string;
}) {
  return (
    <section className={`relative overflow-hidden border-b border-border/60 ${compact ? "py-14 sm:py-16" : "py-20 sm:py-28"}`}>
      <div aria-hidden className="absolute inset-0">
        <HeroField />
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-64 w-64 translate-y-1/3 rounded-full bg-brand-accent/10 blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 container mx-auto px-6 text-center"
      >
        <div className="mx-auto max-w-3xl">
          {eyebrow && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-medium uppercase tracking-wider text-primary">
              {eyebrow}
            </span>
          )}
          <h1
            className={`font-display [text-wrap:balance] ${compact ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl lg:text-6xl"}`}
            data-testid={titleTestId}
          >
            {title}
          </h1>
          {subtitle && (
            <p className={`mx-auto mt-5 max-w-2xl text-muted-foreground [text-wrap:pretty] ${compact ? "text-base sm:text-lg" : "text-lg sm:text-xl leading-relaxed"}`}>
              {subtitle}
            </p>
          )}
          {children && <div className="mt-8">{children}</div>}
        </div>
      </motion.div>
    </section>
  );
}
