import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Testimonial {
  id: string;
  name: string;
  role: string;
  content: string;
}

const testimonials: Testimonial[] = [
  {
    id: "1",
    name: "Alex M.",
    role: "Self-taught Developer",
    content: "The first principles approach helped me understand programming concepts I struggled with for months. Everything finally clicked into place.",
  },
  {
    id: "2",
    name: "Jordan K.",
    role: "Entrepreneur",
    content: "Breaking down business concepts into fundamentals gave me a new perspective. I now approach problems more systematically.",
  },
  {
    id: "3",
    name: "Sam R.",
    role: "Lifelong Learner",
    content: "I love how each topic builds from the ground up. It builds real intuition instead of just memorizing facts.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-32 sm:py-40 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6" data-testid="text-testimonials-title">
            Loved by curious minds
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            See how first principles learning has helped others understand complex topics.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.figure
              key={testimonial.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="relative"
              data-testid={`card-testimonial-${testimonial.id}`}
            >
              <div className="bg-card rounded-3xl p-8 sm:p-10 border border-border/50 h-full">
                <blockquote className="text-lg leading-relaxed mb-8">
                  "{testimonial.content}"
                </blockquote>
                <figcaption className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-medium">
                      {testimonial.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </figcaption>
              </div>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
