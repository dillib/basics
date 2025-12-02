import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, CreditCard, GraduationCap, Settings, MessageSquare, Sparkles, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";

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
        answer: "Click the 'Sign in' button in the top right corner. You can sign in using your Replit account. Once signed in, you'll have access to your dashboard and can start learning.",
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
    title: "Billing & Pricing",
    icon: CreditCard,
    description: "Questions about plans and payments",
    faqs: [
      {
        question: "What plans are available?",
        answer: "We offer three plans: Free (1 topic), Pay-per-topic ($1.99 per topic with lifetime access), and Pro ($9.99/month for unlimited topics). See our Pricing page for full details.",
      },
      {
        question: "How does the free plan work?",
        answer: "With the free plan, you can fully learn one complete topic including all principles and the quiz. It's a great way to try BasicsTutor before committing to a paid plan.",
      },
      {
        question: "What does Pay-per-topic include?",
        answer: "When you purchase a topic for $1.99, you get lifetime access to that topic. This includes all principles, quizzes, and any future updates to that topic's content.",
      },
      {
        question: "Can I cancel my Pro subscription?",
        answer: "Yes, you can cancel your Pro subscription at any time. You'll continue to have access until the end of your billing period. Topics you've already accessed will remain in your history.",
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor, Stripe. All transactions are encrypted and secure.",
      },
      {
        question: "Do you offer refunds?",
        answer: "For individual topic purchases, we offer refunds within 24 hours if you haven't started learning the topic. For Pro subscriptions, contact us within 7 days of your first charge for a full refund.",
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
        answer: "Yes, we take security seriously. Your data is encrypted, we use secure authentication through Replit, and we never share your personal information with third parties. See our Privacy Policy for details.",
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
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-6">
              <HelpCircle className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-help-title">
              Help Center
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Find answers to common questions or contact our support team for help.
            </p>

            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 pl-12 text-base"
                data-testid="input-help-search"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-3" data-testid="text-search-results">
                Found {totalResults} result{totalResults !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            )}
          </div>

          {!searchQuery && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              {faqCategories.map((category) => (
                <Card 
                  key={category.id}
                  className={`border-card-border cursor-pointer hover-elevate transition-all ${
                    selectedCategory === category.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => handleCategoryClick(category.id)}
                  data-testid={`card-category-${category.id}`}
                >
                  <CardContent className="p-6 text-center">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                      <category.icon className="h-6 w-6 text-primary" />
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
