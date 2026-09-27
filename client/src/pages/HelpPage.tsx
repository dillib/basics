import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, CreditCard, GraduationCap, Settings, MessageSquare, Sparkles, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";


interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: typeof BookOpen;
  description: string;
  faqs: FAQItem[];
}

const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Learn the basics of using BasicsTutor",
    faqs: [
      {
        question: "What is BasicsTutor?",
        answer: "BasicsTutor is an AI-powered learning platform that teaches complex topics by breaking them down into first principles. We help you understand concepts from the ground up, building a solid foundation of knowledge.",
      },
      {
        question: "How do I create an account?",
        answer: "Click the 'Sign in' button in the top right corner and continue with your Google account. Once signed in, you'll have access to your dashboard and can start learning.",
      },
      {
        question: "What is first principles learning?",
        answer: "First principles learning means breaking down complex topics into their most fundamental truths, then building understanding from there. Instead of memorizing facts, you learn the 'why' behind concepts, leading to deeper and more lasting understanding.",
      },
      {
        question: "How do I start learning a topic?",
        answer: "Go to the Topics page and either browse existing topics or generate a new one. Enter any topic you want to learn, and our AI will break it down into fundamental principles for you.",
      },
    ],
  },
  {
    id: "topics-learning",
    title: "Topics & Learning",
    icon: GraduationCap,
    description: "Understanding how topics and learning work",
    faqs: [
      {
        question: "How are topics generated?",
        answer: "Our AI (powered by Google Gemini) analyzes your topic request and creates a structured learning path. It identifies 4-6 core principles, writes detailed explanations with real-world analogies, and generates quizzes to test your understanding.",
      },
      {
        question: "Can I generate any topic?",
        answer: "Yes! You can generate topics on almost anything - from quantum physics to cooking techniques, from philosophy to programming. Our AI adapts to create appropriate first-principles breakdowns for any subject.",
      },
      {
        question: "How long does it take to learn a topic?",
        answer: "Each topic has an estimated learning time shown on the card (typically 20-60 minutes). However, you can learn at your own pace. Progress is saved automatically, so you can continue where you left off.",
      },
      {
        question: "What are principles?",
        answer: "Principles are the fundamental concepts that make up a topic. Each principle includes a detailed explanation, a real-world analogy to help you understand, and key takeaways. They're ordered from most basic to more advanced.",
      },
      {
        question: "How do quizzes work?",
        answer: "After learning the principles, you can take a quiz to test your understanding. Quizzes have 5 multiple-choice questions based on the principles you learned. Each question includes an explanation of the correct answer.",
      },
    ],
  },
  {
    id: "billing-pricing",
    title: "Pricing",
    icon: CreditCard,
    description: "Is it free, and will it stay free?",
    // Pricing isn't decided yet: these answers intentionally quote no plans
    // or prices. Keep in step with section 3 of the Terms of Service.
    faqs: [
      {
        question: "Is BasicsTutor really free?",
        answer: "Yes. Right now everything on BasicsTutor is free: every topic, quiz, and animated visual. There's nothing to buy and no payment details to enter.",
      },
      {
        question: "Will it always be free?",
        answer: "We may add optional paid features in the future. If we do, we'll announce them in advance, and you'll never be charged unless you explicitly choose to buy something. Join the waitlist on the homepage to hear first.",
      },
      {
        question: "Do I need a credit card to sign up?",
        answer: "No. Creating an account and learning are free, and we don't ask for payment details.",
      },
    ],
  },
  {
    id: "account",
    title: "Account & Settings",
    icon: Settings,
    description: "Managing your account",
    faqs: [
      {
        question: "How do I access my dashboard?",
        answer: "Once signed in, click 'Dashboard' in the navigation menu. Your dashboard shows your learning progress, topics you've started, and quiz scores.",
      },
      {
        question: "How is my progress tracked?",
        answer: "Your progress is automatically saved as you learn. We track which principles you've completed and your quiz scores. Progress syncs across devices when you're signed in.",
      },
      {
        question: "Can I delete my account?",
        answer: "Yes, you can request account deletion by contacting us at support@basicstutor.com. We'll process your request and delete all your data within 30 days.",
      },
      {
        question: "Is my data secure?",
        answer: "Yes, we take security seriously. Your data is encrypted, we use secure authentication through Google Sign-In, and we never share your personal information with third parties. See our Privacy Policy for details.",
      },
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => 
    !searchQuery || category.faqs.length > 0
  );

  const totalResults = filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHero
        compact
        eyebrow="Help Center"
        title="How can we help?"
        subtitle="Answers to common questions, or reach the team directly."
        titleTestId="text-help-title"
      >
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 rounded-xl border-2 border-foreground/10 bg-background pl-12 text-base shadow-glow focus-visible:border-primary/50 focus-visible:ring-offset-0"
                data-testid="input-help-search"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-search-results">
                Found {totalResults} result{totalResults !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            )}
      </PageHero>
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {!searchQuery && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {faqCategories.map((category) => (
                <Card 
                  key={category.id}
                  className={`border-card-border cursor-pointer card-hover transition-all ${
                    selectedCategory === category.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleCategoryClick(category.id)}
                  data-testid={`card-category-${category.id}`}
                >
                  <CardContent className="p-6 text-center">
                    <div
                      className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-4 bg-ink text-gold ring-1 ring-inset ring-white/10"
                    >
                      <category.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-medium mb-1">{category.title}</h3>
                    <p className="text-sm text-muted-foreground">{category.faqs.length} articles</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-8">
            {filteredCategories
              .filter(cat => !selectedCategory || cat.id === selectedCategory)
              .map((category) => (
                <Card key={category.id} className="border-card-border" data-testid={`section-${category.id}`}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle>{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`${category.id}-${index}`}>
                          <AccordionTrigger 
                            className="text-left"
                            data-testid={`accordion-trigger-${category.id}-${index}`}
                          >
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent 
                            className="text-muted-foreground"
                            data-testid={`accordion-content-${category.id}-${index}`}
                          >
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card className="border-card-border mt-12 bg-muted/30" data-testid="card-still-need-help">
            <CardContent className="p-8 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Still need help?</h3>
              <p className="text-muted-foreground mb-6">
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/contact">
                  <Button data-testid="button-contact-support">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Support
                  </Button>
                </Link>
                <Button variant="outline" asChild>
                  <a href="mailto:support@basicstutor.com" data-testid="button-email-support">
                    Email us directly
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
