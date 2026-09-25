import { motion, type Variants } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { scaleWidths, type VisualSpec } from "@shared/visuals";

type SceneOf<K extends VisualSpec["kind"]> = Extract<VisualSpec, { kind: K }>;

export interface SceneProps<K extends VisualSpec["kind"]> {
  spec: SceneOf<K>;
  /** Start the animation (true once the scene scrolls into view). */
  play: boolean;
  /** Reduced motion: render the finished state with no animation. */
  instant: boolean;
}

/** Shared root props: hidden until `play`, or straight to final if `instant`. */
function stage(play: boolean, instant: boolean, stagger: number) {
  return {
    initial: instant ? (false as const) : ("hidden" as const),
    animate: play || instant ? ("show" as const) : ("hidden" as const),
    variants: { show: { transition: { staggerChildren: stagger, delayChildren: 0.15 } } } as Variants,
  };
}

const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ---------------------------------------------------------------- flow ----

export function FlowScene({ spec, play, instant }: SceneProps<"flow">) {
  const step = 0.5;
  const total = spec.steps.length * step;
  return (
    <motion.ol className="relative space-y-4" {...stage(play, instant, step)}>
      {/* Rail that fills top-to-bottom as each step lights up. */}
      <span aria-hidden className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-primary/15" />
      <motion.span
        aria-hidden
        className="absolute left-[15px] top-4 bottom-4 w-0.5 origin-top bg-primary"
        variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: total, ease: "linear" } } }}
      />
      {!instant && play && (
        // A pulse that keeps traveling the chain once it's built: cause -> effect.
        <span aria-hidden className="absolute bottom-4 left-[12px] top-4 w-2">
          <motion.span
            className="absolute left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]"
            initial={{ top: "0%", opacity: 0 }}
            animate={{ top: ["0%", "100%"], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.4, delay: total + 0.3, repeat: Infinity, repeatDelay: 0.8, ease: "easeInOut" }}
          />
        </span>
      )}
      {spec.steps.map((s, i) => (
        <motion.li key={i} variants={rise} className="relative flex items-start gap-3">
          <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground ring-4 ring-card">
            {i + 1}
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-medium leading-snug">{s.label}</p>
            {s.detail && <p className="mt-0.5 text-xs text-muted-foreground">{s.detail}</p>}
          </div>
        </motion.li>
      ))}
    </motion.ol>
  );
}

// --------------------------------------------------------------- cycle ----

export function CycleScene({ spec, play, instant }: SceneProps<"cycle">) {
  const n = spec.steps.length;
  const R = 34; // % of the square stage
  return (
    <motion.div className="relative mx-auto aspect-square w-full max-w-[320px]" {...stage(play, instant, 0.35)}>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="50" cy="50" r={R} fill="none" className="stroke-primary/25" strokeWidth="0.8" strokeDasharray="2 2" />
        {!instant && (
          <motion.g
            animate={play ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 6, ease: "linear", repeat: Infinity, delay: n * 0.35 }}
          >
            {/* framer rotates SVG groups about their own bounding box; this
                invisible circle centers that box on the ring's center so the
                dot orbits instead of spinning in place. */}
            <circle cx="50" cy="50" r={R + 3} fill="none" stroke="none" />
            <circle cx="50" cy={50 - R} r="2.2" className="fill-primary" />
          </motion.g>
        )}
      </svg>
      <RefreshCw aria-hidden className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-primary/40" />
      {spec.steps.map((s, i) => {
        const a = (-90 + (i * 360) / n) * (Math.PI / 180);
        // Outer div positions (static Tailwind translate); inner div animates.
        // Animating y on the same element would replace the centering transform.
        return (
          <div
            key={i}
            // Fewer steps = more room around the ring; wider labels avoid
            // cramped 4-line wraps like "Interest / joins / the / balance".
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${n <= 4 ? "max-w-[44%]" : "max-w-[36%]"}`}
            style={{ left: `${50 + R * Math.cos(a)}%`, top: `${50 + R * Math.sin(a)}%` }}
          >
            <motion.div
              variants={rise}
              className="rounded-md border border-primary/30 bg-card px-2 py-1 text-center text-xs font-medium leading-tight shadow-sm"
            >
              {s.label}
            </motion.div>
          </div>
        );
      })}
    </motion.div>
  );
}

// ------------------------------------------------------------- compare ----

export function CompareScene({ spec, play, instant }: SceneProps<"compare">) {
  const column = (side: SceneOf<"compare">["left"], accent: boolean, from: number) => (
    <motion.div
      variants={{ hidden: { opacity: 0, x: from }, show: { opacity: 1, x: 0, transition: { duration: 0.45, staggerChildren: 0.18 } } }}
      className={`rounded-lg border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}
    >
      <p className={`mb-2 text-sm font-semibold ${accent ? "text-primary" : ""}`}>{side.title}</p>
      <ul className="space-y-1.5">
        {side.points.map((p, i) => (
          <motion.li key={i} variants={rise} className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${accent ? "bg-primary" : "bg-muted-foreground"}`} />
            {p}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
  return (
    <motion.div className="relative grid grid-cols-2 gap-3" {...stage(play, instant, 0.3)}>
      {column(spec.left, false, -12)}
      {column(spec.right, true, 12)}
      <motion.span
        // x/y via framer (not Tailwind) so they compose with the scale animation.
        style={{ x: "-50%", y: "-50%" }}
        variants={{ hidden: { scale: 0 }, show: { scale: 1 } }}
        className="absolute left-1/2 top-1/2 rounded-full border bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      >
        vs
      </motion.span>
    </motion.div>
  );
}

// ------------------------------------------------------------ timeline ----

export function TimelineScene({ spec, play, instant }: SceneProps<"timeline">) {
  const step = 0.4;
  return (
    <motion.ol className="relative space-y-3" {...stage(play, instant, step)}>
      <motion.span
        aria-hidden
        className="absolute bottom-2 top-2 w-0.5 origin-top bg-primary/40"
        // 5.5rem label column + 12px gap + half of the 12px dot, minus half the 2px line.
        style={{ left: "calc(5.5rem + 17px)" }}
        variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: spec.events.length * step, ease: "linear" } } }}
      />
      {spec.events.map((e, i) => (
        <motion.li key={i} variants={rise} className="relative flex items-center gap-3">
          <span className="w-[5.5rem] shrink-0 text-right text-xs font-semibold tabular-nums text-primary">{e.when}</span>
          <span aria-hidden className="z-10 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-card" />
          <span className="min-w-0 text-sm leading-snug">{e.label}</span>
        </motion.li>
      ))}
    </motion.ol>
  );
}

// --------------------------------------------------------------- scale ----

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

export function ScaleScene({ spec, play, instant }: SceneProps<"scale">) {
  const { widths, log } = scaleWidths(spec.items.map((i) => i.value));
  return (
    <div>
      <motion.div className="space-y-2.5" {...stage(play, instant, 0.2)}>
        {spec.items.map((item, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,34%)_1fr] items-center gap-3">
            <span className="text-xs font-medium leading-tight">{item.label}</span>
            <div className="flex items-center gap-2">
              <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                <motion.div
                  className="h-full rounded bg-primary"
                  variants={{
                    hidden: { width: "0%" },
                    show: { width: `${widths[i]}%`, transition: { duration: 0.9, ease: "easeOut" } },
                  }}
                />
              </div>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                {compact.format(item.value)}
                {spec.unit ? ` ${spec.unit}` : ""}
              </span>
            </div>
          </div>
        ))}
      </motion.div>
      {log && <p className="mt-2 text-[11px] text-muted-foreground">Logarithmic scale — the values span a huge range.</p>}
    </div>
  );
}

// -------------------------------------------------------------- layers ----

export function LayersScene({ spec, play, instant }: SceneProps<"layers">) {
  const n = spec.layers.length;
  return (
    // column-reverse puts layers[0] (the foundation) at the bottom, and since
    // it's also first in DOM order it animates in first: the stack builds up.
    <motion.div className="flex flex-col-reverse items-center gap-1.5" {...stage(play, instant, 0.45)}>
      {spec.layers.map((layer, i) => {
        const width = 100 - (n > 1 ? (i * 36) / (n - 1) : 0);
        const foundation = i === 0;
        return (
          <motion.div
            key={i}
            variants={{
              hidden: { opacity: 0, y: -18 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 22 } },
            }}
            style={{ width: `${width}%` }}
            className={`rounded-md border px-3 py-2 text-center ${
              foundation ? "border-primary bg-primary text-primary-foreground" : "border-primary/30 bg-primary/10"
            }`}
          >
            <p className="text-sm font-medium leading-snug">{layer.label}</p>
            {layer.detail && (
              <p className={`mt-0.5 text-xs ${foundation ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{layer.detail}</p>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
