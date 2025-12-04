import { motion } from "framer-motion";
import { Lightbulb, Layers, Target, Sparkles, BookOpen, Brain } from "lucide-react";
import demoImage from "@assets/stock_images/laptop_computer_with_c100523f.jpg";

const steps = [
  {
    icon: Lightbulb,
    title: "Break it down",
    description: "Our AI identifies the core principles that form the foundation of any topic—the fundamental truths that everything else builds upon.",
  },
  {
    icon: Layers,
    title: "Build it up",
    description: "Each concept connects to the next with clear explanations, real-world analogies, and visual diagrams that make complex ideas click.",
  },
  {
    icon: Target,
    title: "Make it stick",
    description: "Interactive quizzes with instant feedback ensure you truly understand each principle before moving forward.",
  },
];

const floatingElements = [
  { icon: Sparkles, label: "AI-Powered", delay: 0 },
  { icon: BookOpen, label: "First Principles", delay: 0.2 },
  { icon: Brain, label: "Deep Understanding", delay: 0.4 },
];

export default function HowItWorks() {
  return (
    <section className="py-32 sm:py-40 bg-background">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-6" data-testid="text-how-it-works-title">
            Learning, reimagined
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The most effective way to learn anything is to understand it from the ground up. 
            Here's how BasicsTutor makes that happen.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto mb-20"
        >
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/5 to-purple-500/5 border border-border/50 shadow-2xl group" data-testid="demo-showcase">
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none z-10" />
            <img
              src={demoImage}
              alt="BasicsTutor learning platform demonstration"
              className="w-full aspect-video object-cover transition-transform duration-700 group-hover:scale-105"
              data-testid="image-demo"
            />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center"
              >
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mb-2 drop-shadow-lg">
                  Learn any topic from first principles
                </h3>
                <p className="text-white/90 text-lg drop-shadow-md max-w-md">
                  AI-powered breakdowns that make complex ideas simple
                </p>
              </motion.div>
              
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {floatingElements.map(({ icon: Icon, label, delay }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: delay + 0.6 }}
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-white text-sm font-medium shadow-lg"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Experience how BasicsTutor breaks down complex topics into digestible first principles
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className="relative group"
              data-testid={`card-step-${index + 1}`}
            >
              <div className="relative bg-card rounded-3xl p-10 sm:p-12 border border-border/50 h-full transition-all duration-300 hover:border-border hover:shadow-lg">
                <div className="mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center">
                    <step.icon className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="text-2xl font-semibold mb-4">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
