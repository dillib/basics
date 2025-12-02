import HeroSection from "@/components/HeroSection";
import TrustIndicators from "@/components/TrustIndicators";
import HowItWorks from "@/components/HowItWorks";
import FeaturedTopics from "@/components/FeaturedTopics";
import Testimonials from "@/components/Testimonials";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    setLocation(`/topics?topic=${encodeURIComponent(query)}`);
  };

  const handleTopicClick = (topicId: string) => {
    console.log("Topic clicked:", topicId);
    setLocation(`/topic/${topicId}`);
  };

  const handlePlanSelect = (planId: string) => {
    console.log("Plan selected:", planId);
    // todo: implement payment flow
  };

  const handleGetStarted = () => {
    const searchInput = document.querySelector('[data-testid="input-hero-search"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen">
      <HeroSection onSearch={handleSearch} onTopicClick={(topic) => handleSearch(topic)} />
      <TrustIndicators />
      <HowItWorks />
      <FeaturedTopics onTopicClick={handleTopicClick} />
      <Testimonials />
      <PricingSection onSelectPlan={handlePlanSelect} />
      <CTASection onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
