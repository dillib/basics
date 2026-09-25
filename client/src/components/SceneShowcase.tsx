import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Atom, Landmark, Network, Syringe, type LucideIcon } from "lucide-react";
import { ConceptVisualView } from "./visuals/ConceptVisual";
import { parseVisualSpec, type VisualSpec } from "@shared/visuals";

/**
 * "See it, don't just read it" -- live concept scenes on the homepage, the
 * same renderer lessons use. Hard-coded samples: no API calls, instant.
 */

interface Sample { topic: string; icon: LucideIcon; spec: VisualSpec }

const SAMPLES: Sample[] = [
  {
    topic: "Entropy",
    icon: Atom,
    spec: parseVisualSpec({
      kind: "particles",
      mode: "spread",
      caption: "Lift the wall and energy spreads into every available state — it never gathers back on its own.",
      startLabel: "Energy concentrated",
      endLabel: "Energy spread out",
    })!,
  },
  {
    topic: "Compound interest",
    icon: Landmark,
    spec: parseVisualSpec({
      kind: "cycle",
      caption: "Every pass adds interest to the balance, so the next pass earns interest on a bigger base.",
      steps: [{ label: "Balance earns interest" }, { label: "Interest joins the balance" }, { label: "Bigger balance" }],
    })!,
  },
  {
    topic: "How vaccines work",
    icon: Syringe,
    spec: parseVisualSpec({
      kind: "flow",
      caption: "A harmless preview trains the immune system, so the real threat is recognized fast.",
      steps: [
        { label: "Vaccine shows a harmless antigen", detail: "No disease, just the pathogen's signature" },
        { label: "Immune system builds antibodies" },
        { label: "Memory cells are stored", detail: "Some last for years or decades" },
        { label: "Real infection is stopped early" },
      ],
    })!,
  },
  {
    topic: "How the internet works",
    icon: Network,
    spec: parseVisualSpec({
      kind: "layers",
      caption: "Each layer only works because the one beneath it does — start at the foundation.",
      layers: [
        { label: "Physical links", detail: "Cables, fiber, and radio carry raw signals" },
        { label: "IP: addressing and routing", detail: "Packets find their way across networks" },
        { label: "TCP: reliable delivery", detail: "Lost packets are resent, order restored" },
        { label: "HTTP: the web", detail: "Pages and apps you actually use" },
      ],
    })!,
  },
];

const ADVANCE_MS = 9000;

export default function SceneShowcase() {
  const [active, setActive] = useState(0);
  const [userPicked, setUserPicked] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const onScreen = useInView(sectionRef, { amount: 0.4 });

  // Auto-advance only while the section is actually on screen (rotating
  // unseen would skip examples and swap scenes in half-visible), and stop
  // once the visitor chooses one themselves.
  useEffect(() => {
    if (userPicked || !onScreen) return;
    const id = setInterval(() => setActive((a) => (a + 1) % SAMPLES.length), ADVANCE_MS);
    return () => clearInterval(id);
  }, [userPicked, onScreen]);

  const pick = (i: number) => {
    setActive(i);
    setUserPicked(true);
  };

  return (
    <section ref={sectionRef} className="py-20 sm:py-28 bg-background" aria-labelledby="showcase-title">
      <div className="container mx-auto px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">Every lesson, animated</p>
            <h2 id="showcase-title" className="text-3xl font-semibold tracking-tight [text-wrap:balance] sm:text-4xl">
              See it, don't just read it
            </h2>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
              Each principle comes with a live visual of how it works — a simulation, a process, a feedback loop — so the idea clicks before you finish the paragraph.
            </p>

            <div role="tablist" aria-label="Example concepts" className="mt-8 flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap">
              {SAMPLES.map((s, i) => {
                const selected = i === active;
                return (
                  <button
                    key={s.topic}
                    role="tab"
                    aria-selected={selected}
                    aria-controls="showcase-panel"
                    onClick={() => pick(i)}
                    className={`group relative flex items-center gap-3 overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full lg:max-w-sm ${
                      selected ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                    data-testid={`tab-showcase-${i}`}
                  >
                    <s.icon className={`h-4 w-4 shrink-0 ${selected ? "text-primary" : ""}`} />
                    <span className="font-medium">{s.topic}</span>
                    {/* Progress bar showing when the next example rotates in. */}
                    {selected && !userPicked && onScreen && (
                      <motion.span
                        key={`bar-${active}`}
                        aria-hidden
                        className="absolute bottom-0 left-0 h-0.5 bg-primary/60"
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: ADVANCE_MS / 1000, ease: "linear" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div id="showcase-panel" role="tabpanel" className="min-h-[360px]">
            <ConceptVisualView key={active} spec={SAMPLES[active].spec} />
          </div>
        </div>
      </div>
    </section>
  );
}
