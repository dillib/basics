import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Dashboard from "@/components/Dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@shared/schema";

export default function DashboardPage() {
  const [, setLocation] = useLocation();
  
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ['/api/auth/user'],
    retry: false,
  });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="container mx-auto">
          <div className="flex gap-8">
            <div className="w-64">
              <Skeleton className="h-[400px] rounded-lg" />
            </div>
            <div className="flex-1 space-y-6">
              <Skeleton className="h-10 w-64" />
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
              <Skeleton className="h-64 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    setLocation('/');
    return null;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}
