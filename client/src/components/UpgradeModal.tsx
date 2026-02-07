import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Trophy, CheckCircle2 } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "first_topic" | "signup" | "pro";
  currentCount?: number;
  maxCount?: number;
}

export function UpgradeModal({ isOpen, onClose, type, currentCount = 0, maxCount = 1 }: UpgradeModalProps) {
  const handleSignIn = () => {
    window.location.href = "/api/auth/google";
  };

  const handleUpgradeToPro = () => {
    window.location.href = "/pricing";
  };

  if (type === "first_topic") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center text-2xl">
              You've Unlocked Your First Topic! 🎉
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sign in to save your progress and get <span className="font-semibold text-primary">3 more free topics</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Save Your Progress</p>
                <p className="text-sm text-muted-foreground">All your topics and learning progress synced</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">3 More Free Topics</p>
                <p className="text-sm text-muted-foreground">Explore any subject with AI-powered learning</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Track Your Learning</p>
                <p className="text-sm text-muted-foreground">See your progress and mastery over time</p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleSignIn} className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Sign In with Google
            </Button>
            <Button onClick={onClose} variant="ghost" className="w-full">
              Continue as Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (type === "signup") {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <Sparkles className="h-6 w-6 text-amber-500" />
            </div>
            <DialogTitle className="text-center text-2xl">
              Free Topic Used!
            </DialogTitle>
            <DialogDescription className="text-center pt-2">
              Sign up to get <span className="font-semibold text-primary">3 more free topics</span> and save your progress
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted/50 rounded-lg p-4 my-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Free Topics</span>
              <span className="text-sm text-muted-foreground">{currentCount} / {maxCount} used</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${(currentCount / maxCount) * 100}%` }}
              />
            </div>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground mb-4">
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              3 more free topics when you sign up
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Save your progress across devices
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Access all your generated topics anytime
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleSignIn} className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Sign Up for Free
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              No credit card required
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Pro upgrade modal
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-600">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Free Limit Reached
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            You've generated {currentCount} topics. Upgrade to Pro for unlimited learning!
          </DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 my-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Free Topics</span>
            <span className="text-sm text-muted-foreground">{currentCount} / {maxCount} used</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-gradient-to-r from-primary to-purple-600 h-2 rounded-full transition-all"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Unlimited Topics</p>
              <p className="text-sm text-muted-foreground">Generate as many topics as you want</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">AI Tutor Access</p>
              <p className="text-sm text-muted-foreground">Get personalized help and explanations</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Advanced Analytics</p>
              <p className="text-sm text-muted-foreground">Track your learning journey in detail</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-purple-600/10 rounded-lg p-4 my-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pro Plan</p>
              <p className="text-2xl font-bold">$9<span className="text-base font-normal">/month</span></p>
            </div>
            <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
              Popular
            </Badge>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleUpgradeToPro} className="w-full" size="lg">
            <Zap className="mr-2 h-4 w-4" />
            Upgrade to Pro
          </Button>
          <Button onClick={onClose} variant="ghost" className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Badge({ children, className, variant }: { children: React.ReactNode; className?: string; variant?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
