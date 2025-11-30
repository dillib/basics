import { ThemeProvider } from "../ThemeProvider";
import AuthModal from "../AuthModal";
import { Card, CardContent } from "@/components/ui/card";

export default function AuthModalExample() {
  return (
    <ThemeProvider>
      <div className="p-4 bg-background min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <AuthModal onSuccess={() => console.log("Auth success")} />
          </CardContent>
        </Card>
      </div>
    </ThemeProvider>
  );
}
