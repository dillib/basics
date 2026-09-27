import { Link } from "wouter";
import PageHero from "@/components/PageHero";
import Footer from "@/components/Footer";
import { FOUNDER, HOW_LESSONS_ARE_MADE, LIMITS } from "@/data/aboutContent";

export default function AboutPage() {
  const initials = FOUNDER.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen bg-background">
      <PageHero
        eyebrow="About"
        titleTestId="text-about-title"
        title={<>Who's behind <span className="text-brand-emphasis">BasicsTutor</span></>}
        subtitle="One founder, one idea: understanding beats memorizing. Here's who builds it and exactly how every lesson is made."
        compact
      />

      <main className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-[70ch] space-y-16">
          <section aria-labelledby="founder-title">
            <h2 id="founder-title" className="text-2xl font-semibold mb-6">The founder</h2>
            <figure className="rounded-2xl border border-border bg-card p-6 sm:p-8">
              <blockquote className="space-y-4 text-lg leading-relaxed text-foreground/90">
                {FOUNDER.note.map((p, i) => <p key={i} className={i === 0 ? "font-display text-2xl leading-snug text-foreground" : ""}>{p}</p>)}
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">{initials}</span>
                <span>
                  <span className="block font-semibold">{FOUNDER.name}</span>
                  <span className="block text-sm text-muted-foreground">{FOUNDER.title}</span>
                </span>
              </figcaption>
            </figure>
          </section>

          <section id="how-lessons-are-made" aria-labelledby="how-title" className="scroll-mt-24">
            <h2 id="how-title" className="text-2xl font-semibold mb-6">How lessons are made</h2>
            <ol className="space-y-6">
              {HOW_LESSONS_ARE_MADE.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span aria-hidden className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-gold ring-1 ring-inset ring-white/10">{i + 1}</span>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-1 text-muted-foreground leading-relaxed">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="limits-title">
            <h2 id="limits-title" className="text-2xl font-semibold mb-4">What to keep in mind</h2>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground leading-relaxed">
              {LIMITS.map((l) => <li key={l}>{l}</li>)}
            </ul>
            <p className="mt-6">
              Found a mistake or have an idea? <Link href="/contact" className="font-medium underline underline-offset-4">Get in touch</Link>, we read every message.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
