import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  // todo: replace with actual user data from auth
  return (
    <Dashboard 
      userName="Alex Johnson"
      userEmail="alex@example.com"
      subscriptionTier="pro"
    />
  );
}
