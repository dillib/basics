import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Home, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-card-border">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2" data-testid="text-404-title">404</h1>
          <p className="text-xl font-semibold mb-2">Page Not Found</p>
          <p className="text-muted-foreground mb-8">
            Looks like this page hasn't been discovered yet. Let's get you back to learning!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button data-testid="button-go-home">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Link href="/topics">
              <Button variant="outline" data-testid="button-explore-topics">
                <BookOpen className="h-4 w-4 mr-2" />
                Explore Topics
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
