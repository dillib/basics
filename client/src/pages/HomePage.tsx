import { useState } from "react";
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

  const [generatingTopic, setGeneratingTopic] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);

  const generateTopicMutation = useMutation({
    mutationFn: async (title: string) => {
      setGeneratingTopic(title);
      const response = await apiRequest("POST", "/api/topics/generate", { title });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to generate topic");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.existing) {
        // If existing, direct redirect
        setLocation(`/topic/${data.topic.slug}`);
      } else {
        // If job started, set ID to start polling
        setJobId(data.jobId);
      }
    },
    onError: (error: Error) => {
      setGeneratingTopic("");
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
  
  const handleGenerationComplete = (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
      // Short delay for user to see 100%
      setTimeout(() => {
          setLocation(`/topic/${result.slug}`);
      }, 500);
  };
  
  const handleGenerationError = (error: Error) => {
      setGeneratingTopic("");
      setJobId(null);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
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
        isGenerating={generateTopicMutation.isPending || !!jobId}
        topicTitle={generatingTopic}
        jobId={jobId}
        onComplete={handleGenerationComplete}
        onError={handleGenerationError}
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
