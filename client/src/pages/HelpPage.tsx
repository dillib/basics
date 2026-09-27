import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Search, BookOpen, CreditCard, GraduationCap, Settings, MessageSquare, Sparkles, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import Footer from "@/components/Footer";
import PageHero from "@/components/PageHero";
import { faqCategories } from "@/data/helpFaqs";


// Icons for the FAQ categories (data lives in @/data/helpFaqs).
const FAQ_ICONS: Record<string, typeof BookOpen> = { BookOpen, GraduationCap, CreditCard, Settings };
function FaqIcon({ name, className }: { name: string; className?: string }) {
  const Icon = FAQ_ICONS[name] ?? HelpCircle;
  return <Icon className={className} />;
}

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
                      <FaqIcon name={category.icon} className="h-6 w-6" />
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
                        <FaqIcon name={category.icon} className="h-5 w-5 text-primary" />
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
