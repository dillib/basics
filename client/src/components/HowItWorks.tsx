import { motion } from "framer-motion";
import { Lightbulb, Layers, Target, Search, BookOpen, CheckCircle2, Brain, Sparkles } from "lucide-react";

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

const demoSteps = [
  { icon: Search, text: "Enter any topic", color: "from-blue-500 to-indigo-500" },
  { icon: Brain, text: "AI analyzes & breaks it down", color: "from-purple-500 to-pink-500" },
  { icon: BookOpen, text: "Learn first principles", color: "from-indigo-500 to-violet-500" },
  { icon: CheckCircle2, text: "Test your understanding", color: "from-emerald-500 to-teal-500" },
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
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 border border-border/50 shadow-2xl p-8 sm:p-12" data-testid="demo-showcase">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5" />
            <div className="absolute top-4 right-4">
              <Sparkles className="h-6 w-6 text-primary/40 animate-pulse" />
            </div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <motion.h3 
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="text-2xl sm:text-3xl font-semibold text-white mb-2"
                >
                  Your learning journey
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="text-slate-400"
                >
                  From curiosity to mastery in four simple steps
                </motion.p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {demoSteps.map(({ icon: Icon, text, color }, index) => (
                  <motion.div
                    key={text}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
                    className="flex flex-col items-center text-center group"
                    data-testid={`demo-step-${index + 1}`}
                  >
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                    </div>
                    <span className="text-sm sm:text-base text-slate-300 font-medium">{text}</span>
                    {index < demoSteps.length - 1 && (
                      <div className="hidden sm:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              <motion.div 
                initial={{ opacity: 0, scaleX: 0 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="hidden sm:block mt-6 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 rounded-full origin-left"
              />
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
