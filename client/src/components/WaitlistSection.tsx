import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const proPerks = [
  "Unlimited topics & quizzes",
  "AI Tutor chat for every principle",
  "Interactive mind maps",
  "Printable reference sheets",
  "Priority on new features",
];

export default function WaitlistSection({ source = "pricing" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/waitlist", { email: trimmed, source });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      toast({
        title: "Couldn't join the waitlist",
        description: (err as Error).message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-32 sm:py-40 bg-muted/30" id="pricing">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Free during early access</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6">
            Everything's free right now
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Generate any topic, take quizzes, and learn from first principles — no payment, no catch.
            Pro is coming with even more. Join the waitlist for early-bird perks.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-lg mx-auto mb-10">
            {proPerks.map((perk) => (
              <div key={perk} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3 w-3 text-primary" />
                </span>
                <span className="text-sm text-muted-foreground">{perk}</span>
              </div>
            ))}
          </div>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-4"
              data-testid="waitlist-success"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium">You're on the list — we'll be in touch. Thank you!</span>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto"
            >
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-full px-5"
                data-testid="input-waitlist-email"
                aria-label="Email address for Pro waitlist"
              />
              <Button
                type="submit"
                size="lg"
                disabled={isSubmitting}
                className="h-12 rounded-full px-6 gap-2 w-full sm:w-auto shrink-0"
                data-testid="button-waitlist-submit"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Join waitlist
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            No spam. We'll only email you about the Pro launch.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
