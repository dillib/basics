import HeroSection from "@/components/HeroSection";
import TrustIndicators from "@/components/TrustIndicators";
import FeaturedTopics from "@/components/FeaturedTopics";
import Testimonials from "@/components/Testimonials";
import PricingSection from "@/components/PricingSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const generateTopicMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/topics/generate", { title });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate topic");
      }
      return response.json();
    },
    onSuccess: (newTopic) => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      queryClient.setQueryData(['/api/topics', newTopic.slug], newTopic);
      setLocation(`/topic/${newTopic.slug}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate topic. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateTopic = (query: string) => {
    generateTopicMutation.mutate(query);
  };

  const handleTopicClick = (topicId: string) => {
    setLocation(`/topic/${topicId}`);
  };

  const handlePlanSelect = (planId: string) => {
    console.log("Plan selected:", planId);
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
      <HeroSection 
        onGenerateTopic={handleGenerateTopic} 
        isGenerating={generateTopicMutation.isPending}
      />
      <TrustIndicators />
      <FeaturedTopics onTopicClick={handleTopicClick} />
      <Testimonials />
      <PricingSection onSelectPlan={handlePlanSelect} />
      <CTASection onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
