import { ThemeProvider } from "../ThemeProvider";
import PricingSection from "../PricingSection";

export default function PricingSectionExample() {
  return (
    <ThemeProvider>
      <PricingSection 
        onSelectPlan={(planId) => console.log("Plan selected:", planId)}
      />
    </ThemeProvider>
  );
}
