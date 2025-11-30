import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturedTopics from "@/components/FeaturedTopics";
import Testimonials from "@/components/Testimonials";
import PricingSection from "@/components/PricingSection";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";

export default function HomePage() {
  const [, setLocation] = useLocation();

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    setLocation(`/topic/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, "-"))}`);
  };

  const handleTopicClick = (topicId: string) => {
    console.log("Topic clicked:", topicId);
    setLocation(`/topic/${topicId}`);
  };

  const handlePlanSelect = (planId: string) => {
    console.log("Plan selected:", planId);
    // todo: implement payment flow
  };

  return (
    <div className="min-h-screen">
      <HeroSection onSearch={handleSearch} onTopicClick={(topic) => handleSearch(topic)} />
      <HowItWorks />
      <FeaturedTopics onTopicClick={handleTopicClick} />
      <Testimonials />
      <PricingSection onSelectPlan={handlePlanSelect} />
      <Footer />
    </div>
  );
}
