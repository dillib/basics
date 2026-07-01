import PricingSection from "@/components/PricingSection";
import WaitlistSection from "@/components/WaitlistSection";
import Footer from "@/components/Footer";
import { useAppConfig } from "@/hooks/useAppConfig";

export default function PricingPage() {
  const { monetizationEnabled } = useAppConfig();

  return (
    <div className="min-h-screen bg-background">
      {monetizationEnabled ? (
        <PricingSection onSelectPlan={(planId) => console.log("Selected plan:", planId)} />
      ) : (
        <WaitlistSection source="pricing-page" />
      )}
      <Footer />
    </div>
  );
}
