import { motion } from "framer-motion";

// Personalize this — put your real name here to sign the note with a
// monogram signature. Blank signs off simply as "— Founder, BasicsTutor".
const FOUNDER_NAME: string = "";
const FOUNDER_TITLE = "Founder, BasicsTutor";

export default function FounderNote() {
  return (
    <section className="py-32 sm:py-40 bg-background">
      <div className="container mx-auto px-6">
        <motion.figure
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <p className="text-sm font-medium uppercase tracking-wider text-primary mb-8">
            A note from the founder
          </p>

          <blockquote className="font-display text-3xl sm:text-4xl leading-snug text-foreground">
            I spent years “learning” things I never actually understood —
            memorizing enough to pass, then forgetting it a week later.
          </blockquote>

          <div className="mt-8 space-y-5 text-lg text-muted-foreground leading-relaxed">
            <p>
              The stuff that finally stuck was always the stuff someone broke down
              to its fundamentals, until it just made sense. BasicsTutor is the tool
              I wish I’d had.
            </p>
            <p>
              Type in anything — a concept from work, something your kid asked, a
              topic you’ve avoided for years — and it rebuilds it from first
              principles until it clicks. No jargon, no memorizing. Just
              understanding.
            </p>
            <p className="text-foreground font-medium">
              It’s free while it’s early, and I’d genuinely love to know what you think.
            </p>
          </div>

          {FOUNDER_NAME ? (
            // Personal signature: initials monogram + name + title.
            <figcaption className="mt-10 flex items-center justify-center gap-3">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary"
              >
                {FOUNDER_NAME.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
              </span>
              <div className="text-left">
                <p className="font-semibold text-foreground">{FOUNDER_NAME}</p>
                <p className="text-sm text-muted-foreground">{FOUNDER_TITLE}</p>
              </div>
            </figcaption>
          ) : (
            // No name yet: a single sign-off line. (Stacking "The BasicsTutor
            // Founder" over "Founder, BasicsTutor" said "founder" twice, and a
            // company logo as the avatar read as corporate, not personal.)
            <figcaption className="mt-10 flex flex-col items-center gap-3">
              <span aria-hidden className="h-px w-12 bg-gradient-to-r from-primary to-brand-accent" />
              <p className="text-sm font-medium tracking-wide text-muted-foreground">— {FOUNDER_TITLE}</p>
            </figcaption>
          )}
        </motion.figure>
      </div>
    </section>
  );
}
