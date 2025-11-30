import { ThemeProvider } from "../ThemeProvider";
import Dashboard from "../Dashboard";

export default function DashboardExample() {
  return (
    <ThemeProvider>
      <Dashboard 
        userName="Alex Johnson"
        userEmail="alex@example.com"
        subscriptionTier="pro"
      />
    </ThemeProvider>
  );
}
