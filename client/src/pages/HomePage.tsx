import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import TrustIndicators from "@/components/TrustIndicators";
import FeaturedTopics from "@/components/FeaturedTopics";
import Testimonials from "@/components/Testimonials";
import PricingSection from "@/components/PricingSection";
import WaitlistSection from "@/components/WaitlistSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAppConfig } from "@/hooks/useAppConfig";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackAnonymousTopic } from "@/lib/anonymousTracking";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { monetizationEnabled } = useAppConfig();

  const [generatingTopic, setGeneratingTopic] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    type: "first_topic" | "signup" | "pro";
    currentCount?: number;
    maxCount?: number;
  }>({
    isOpen: false,
    type: "first_topic",
  });

  const generateTopicMutation = useMutation({
    mutationFn: async (title: string) => {
      setGeneratingTopic(title);
      const response = await apiRequest("POST", "/api/topics/generate", { title });
      if (!response.ok) {
        const data = await response.json();
        // Check if it's a limit/upgrade error
        if (response.status === 403 && data.upgradeRequired) {
          const error: any = new Error(data.message);
          error.upgradeData = data;
          throw error;
        }
        throw new Error(data.message || "Failed to generate topic");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // Track anonymous topic in localStorage if not authenticated
      if (!user && data.topic) {
        trackAnonymousTopic({
          id: data.topic.id,
          slug: data.topic.slug,
          title: data.topic.title,
        });
      }

      // Check for upgrade prompt (first topic)
      if (data.showUpgradePrompt && data.upgradeType === "first_topic") {
        setUpgradeModal({
          isOpen: true,
          type: "first_topic",
        });
      }

      // Existing topics resolve immediately; new topics return a background
      // job id that GenerationProgress polls until completion.
      if (data.existing && data.topic?.slug) {
        queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
        setLocation(`/topic/${data.topic.slug}`);
      } else if (data.jobId) {
        setJobId(data.jobId);
      } else {
        setGeneratingTopic("");
        toast({
          title: "Error",
          description: "Failed to start topic generation. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      setGeneratingTopic("");
      setJobId(null);

      // Handle upgrade/limit errors
      if (error.upgradeData) {
        const { upgradeType, currentCount, maxCount } = error.upgradeData;
        setUpgradeModal({
          isOpen: true,
          type: upgradeType === "signup" ? "signup" : "pro",
          currentCount,
          maxCount,
        });
        return;
      }

      // Handle other errors
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

  const handleGenerationComplete = (result: { slug: string }) => {
    queryClient.invalidateQueries({ queryKey: ['/api/topics'] });
    setLocation(`/topic/${result.slug}`);
    setJobId(null);
    setGeneratingTopic("");
  };

  const handleGenerationError = (error: Error) => {
    setJobId(null);
    setGeneratingTopic("");
    toast({
      title: "Generation Failed",
      description: error.message || "Something went wrong. Please try again.",
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
        isGenerating={generateTopicMutation.isPending}
        topicTitle={generatingTopic}
        jobId={jobId}
        onComplete={handleGenerationComplete}
        onError={handleGenerationError}
      />
      <TrustIndicators />
      <FeaturedTopics onTopicClick={handleTopicClick} />
      <Testimonials />
      {monetizationEnabled ? (
        <PricingSection onSelectPlan={handlePlanSelect} />
      ) : (
        <WaitlistSection source="homepage" />
      )}
      <CTASection onGetStarted={handleGetStarted} />
      <Footer />

      <UpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })}
        type={upgradeModal.type}
        currentCount={upgradeModal.currentCount}
        maxCount={upgradeModal.maxCount}
      />
    </div>
  );
}
