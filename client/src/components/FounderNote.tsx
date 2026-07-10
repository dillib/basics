import { motion } from "framer-motion";
import pencilLogo from "@assets/generated_images/smiling_upright_purple_pencil.png";

// Personalize this — put your real name here to sign the note. Leave it blank
// and it signs "The BasicsTutor Founder" (honest, just less personal).
const FOUNDER_NAME = "";
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

          <blockquote className="text-2xl sm:text-3xl font-medium leading-snug tracking-tight text-foreground">
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

          <figcaption className="mt-10 flex items-center justify-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 dark:bg-primary/20 p-0.5 flex items-center justify-center shrink-0">
              <img src={pencilLogo} alt="" className="h-full w-full object-contain rounded-full" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground">
                {FOUNDER_NAME || "The BasicsTutor Founder"}
              </p>
              <p className="text-sm text-muted-foreground">{FOUNDER_TITLE}</p>
            </div>
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
