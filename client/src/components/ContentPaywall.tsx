import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, Zap, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface ContentPaywallProps {
  topicId: string;
  topicTitle: string;
  principlesCount: number;
  previewPrinciples: number;
  payPerTopicPrice: number;
  proMonthlyPrice: number;
  onUnlock?: () => void;
}

export function ContentPaywall({
  topicId,
  topicTitle,
  principlesCount,
  previewPrinciples,
  payPerTopicPrice,
  proMonthlyPrice,
  onUnlock,
}: ContentPaywallProps) {
  const { isAuthenticated } = useAuth();

  const handleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  const handlePayPerTopic = async () => {
    try {
      const response = await fetch(`/api/topics/${topicId}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to initiate purchase");

      const { checkoutUrl } = await response.json();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Purchase error:", error);
    }
  };

  const handleUpgradeToPro = () => {
    window.location.href = "/pricing";
  };

  const lockedCount = principlesCount - previewPrinciples;
  const payPerTopicDollars = (payPerTopicPrice / 100).toFixed(2);
  const proMonthlyDollars = (proMonthlyPrice / 100).toFixed(2);

  return (
    <div className="space-y-4 my-6">
      {/* Blur overlay card showing locked content */}
      <div className="relative">
        <div className="absolute inset-0 backdrop-blur-md bg-background/60 z-10 rounded-lg" />
        <Card className="border-2 border-dashed border-muted-foreground/30">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">
                  {lockedCount} More {lockedCount === 1 ? "Principle" : "Principles"} Locked
                </h3>
                <p className="text-muted-foreground mb-4">
                  You're viewing a preview of <span className="font-semibold">{topicTitle}</span>.
                  Unlock full access to see all {principlesCount} principles, quizzes, and AI tutor.
                </p>

                {!isAuthenticated ? (
                  <div className="space-y-3">
                    <Button onClick={handleSignIn} className="w-full sm:w-auto" size="lg">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Sign In to Unlock
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Sign in with Google to purchase this topic or subscribe
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3 mt-4">
                    {/* Pay per topic option */}
                    <Card className="border-2 hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4" onClick={handlePayPerTopic}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10 flex-shrink-0">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1">Unlock This Topic</h4>
                            <p className="text-2xl font-bold mb-1">
                              ${payPerTopicDollars}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              One-time payment for lifetime access
                            </p>
                            <Button
                              size="sm"
                              className="w-full mt-3 group-hover:bg-primary/90"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePayPerTopic();
                              }}
                            >
                              Purchase Now
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pro subscription option */}
                    <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5 hover:border-primary transition-colors cursor-pointer group">
                      <CardContent className="p-4" onClick={handleUpgradeToPro}>
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600 flex-shrink-0">
                            <Zap className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm">Pro Plan</h4>
                              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                                BEST VALUE
                              </span>
                            </div>
                            <p className="text-2xl font-bold mb-1">
                              ${proMonthlyDollars}
                              <span className="text-sm font-normal text-muted-foreground">/mo</span>
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">
                              Unlimited topics + AI Tutor + Analytics
                            </p>
                            <Button
                              size="sm"
                              variant="default"
                              className="w-full mt-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUpgradeToPro();
                              }}
                            >
                              Upgrade to Pro
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview notice */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
        <Lock className="h-4 w-4" />
        <span>
          Preview mode: Showing {previewPrinciples} of {principlesCount} principles
        </span>
      </div>
    </div>
  );
}
