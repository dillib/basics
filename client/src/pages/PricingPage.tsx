import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <PricingSection onSelectPlan={(planId) => console.log("Selected plan:", planId)} />
      <Footer />
    </div>
  );
}
