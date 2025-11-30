import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="py-12">
        <div className="container mx-auto px-4 text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4" data-testid="text-pricing-page-title">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Unlock unlimited learning with our flexible pricing options.
          </p>
        </div>
      </div>
      <PricingSection onSelectPlan={(planId) => console.log("Selected plan:", planId)} />
      <Footer />
    </div>
  );
}
