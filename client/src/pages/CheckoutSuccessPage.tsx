import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckoutSuccessPage() {
  const [, setLocation] = useLocation();
  const [verificationStatus, setVerificationStatus] = useState<"loading" | "success" | "error">("loading");
  const [purchaseType, setPurchaseType] = useState<string>("");
  const [topicId, setTopicId] = useState<string | null>(null);

  const verifyMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await apiRequest('GET', `/api/checkout/verify/${sessionId}`);
      return response.json();
    },
    onSuccess: (data) => {
      setVerificationStatus("success");
      setPurchaseType(data.type);
      if (data.topicId) {
        setTopicId(data.topicId);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/purchases'] });
    },
    onError: () => {
      setVerificationStatus("error");
    },
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    const topicIdParam = urlParams.get('topic_id');
    
    if (topicIdParam) {
      setTopicId(topicIdParam);
    }

    if (sessionId) {
      verifyMutation.mutate(sessionId);
    } else {
      setVerificationStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md w-full" data-testid="card-checkout-success">
          <CardHeader className="text-center">
            {verificationStatus === "loading" && (
              <>
                <div className="mx-auto mb-4">
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                </div>
                <CardTitle>Verifying your payment...</CardTitle>
                <CardDescription>Please wait while we confirm your purchase.</CardDescription>
              </>
            )}
            
            {verificationStatus === "success" && (
              <>
                <div className="mx-auto mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <CardTitle data-testid="text-success-title">Payment Successful!</CardTitle>
                <CardDescription>
                  {purchaseType === "topic_purchase" 
                    ? "You now have access to your topic."
                    : purchaseType === "pro_subscription"
                    ? "Welcome to Pro! You now have unlimited access to all topics."
                    : "Thank you for your purchase!"}
                </CardDescription>
              </>
            )}
            
            {verificationStatus === "error" && (
              <>
                <CardTitle className="text-destructive">Verification Failed</CardTitle>
                <CardDescription>
                  There was an issue verifying your payment. Please contact support if you were charged.
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="flex flex-col gap-3">
            {verificationStatus === "success" && (
              <>
                {purchaseType === "topic_purchase" && topicId ? (
                  <Button 
                    onClick={() => setLocation(`/dashboard`)}
                    data-testid="button-continue-learning"
                  >
                    Go to Dashboard
                  </Button>
                ) : (
                  <Button 
                    onClick={() => setLocation("/dashboard")}
                    data-testid="button-go-dashboard"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </>
            )}
            
            {verificationStatus === "error" && (
              <Button 
                variant="outline" 
                onClick={() => setLocation("/")}
                data-testid="button-go-home"
              >
                Return to Home
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
