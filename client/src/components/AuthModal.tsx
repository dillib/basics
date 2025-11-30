import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiGoogle, SiGithub, SiApple } from "react-icons/si";

interface AuthModalProps {
  onSuccess?: () => void;
}

export default function AuthModal({ onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSocialLogin = (provider: string) => {
    console.log(`${provider} login triggered`);
    setIsLoading(true);
    // todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
      onSuccess?.();
    }, 1000);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email login triggered", { email, password });
    setIsLoading(true);
    // todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
      onSuccess?.();
    }, 1000);
  };

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email signup triggered", { name, email, password });
    setIsLoading(true);
    // todo: remove mock functionality
    setTimeout(() => {
      setIsLoading(false);
      onSuccess?.();
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("Google")}
          disabled={isLoading}
          data-testid="button-google-login"
        >
          <SiGoogle className="mr-2 h-4 w-4" />
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("GitHub")}
          disabled={isLoading}
          data-testid="button-github-login"
        >
          <SiGithub className="mr-2 h-4 w-4" />
          Continue with GitHub
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleSocialLogin("Apple")}
          disabled={isLoading}
          data-testid="button-apple-login"
        >
          <SiApple className="mr-2 h-4 w-4" />
          Continue with Apple
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

      <Tabs defaultValue="login" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
          <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-login-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-login-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-login">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </TabsContent>
        <TabsContent value="signup">
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signup-name">Full Name</Label>
              <Input
                id="signup-name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                data-testid="input-signup-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-signup-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-signup-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-submit-signup">
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
