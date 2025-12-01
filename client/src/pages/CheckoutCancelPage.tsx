import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function CheckoutCancelPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md w-full" data-testid="card-checkout-cancel">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <XCircle className="h-16 w-16 text-muted-foreground" />
            </div>
            <CardTitle data-testid="text-cancel-title">Checkout Cancelled</CardTitle>
            <CardDescription>
              Your payment was cancelled. No charges were made.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-3">
            <Button 
              onClick={() => setLocation("/pricing")}
              data-testid="button-view-pricing"
            >
              View Pricing Options
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setLocation("/")}
              data-testid="button-go-home"
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
