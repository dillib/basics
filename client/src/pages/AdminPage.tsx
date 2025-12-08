import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, BookOpen, DollarSign, TrendingUp, 
  Shield, Crown, Trash2, LayoutDashboard, Calendar
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { User, Topic, TopicPurchase } from "@shared/schema";

interface AdminStats {
  totalUsers: number;
  totalTopics: number;
  totalRevenue: number;
  topicPurchases: number;
  proSubscriptions: number;
}

interface UsersResponse {
  users: User[];
  total: number;
  limit: number;
  offset: number;
}

interface TopicsResponse {
  topics: Topic[];
  total: number;
  limit: number;
  offset: number;
}

interface PurchasesResponse {
  purchases: TopicPurchase[];
  limit: number;
  offset: number;
}

function AdminOverview() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-users">
              {stats?.totalUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Topics</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-topics">
              {stats?.totalTopics || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-revenue">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Subscribers</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-pro-subscribers">
              {stats?.proSubscriptions || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
            <CardDescription>Topic purchases vs Pro subscriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Topic Purchases</span>
              <span className="font-medium">{stats?.topicPurchases || 0} sales</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pro Subscriptions</span>
              <span className="font-medium">{stats?.proSubscriptions || 0} subscribers</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span className="font-medium">Total Revenue</span>
              <span className="font-bold text-primary">{formatCurrency(stats?.totalRevenue || 0)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common admin tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#users">
                <Users className="mr-2 h-4 w-4" />
                Manage Users
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#topics">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Topics
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <a href="#revenue">
                <TrendingUp className="mr-2 h-4 w-4" />
                View Revenue
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminUsers() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const limit = 20;
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const dateParams = [
    startDate ? `startDate=${startDate.toISOString()}` : '',
    endDate ? `endDate=${endDate.toISOString()}` : ''
  ].filter(Boolean).join('&');
  const dateQueryString = dateParams ? `&${dateParams}` : '';

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: [`/api/admin/users?limit=${limit}&offset=${page * limit}${dateQueryString}`],
  });

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(0);
  };

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return apiRequest('PATCH', `/api/admin/users/${userId}/admin`, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/users')
      });
      toast({ title: "User updated", description: "Admin status changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    },
  });

  const toggleProMutation = useMutation({
    mutationFn: async ({ userId, isPro }: { userId: string; isPro: boolean }) => {
      const expiresAt = isPro ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null;
      return apiRequest('PATCH', `/api/admin/users/${userId}/pro`, { isPro, expiresAt });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/users')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "User updated", description: "Pro status changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const users = data?.users || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Showing {users.length} of {total} users
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filter by join date:</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(d) => { setStartDate(d); setPage(0); }}
              onEndDateChange={(d) => { setEndDate(d); setPage(0); }}
            />
            {(startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={clearDateFilter} data-testid="button-clear-user-date-filter">
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Topics Used</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Pro</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                <TableCell className="font-medium">
                  {user.firstName || user.lastName 
                    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                    : 'Anonymous'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email || 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge variant={user.plan === 'pro' ? 'default' : 'secondary'}>
                    {user.plan || 'free'}
                  </Badge>
                </TableCell>
                <TableCell>{user.topicsUsed || 0}</TableCell>
                <TableCell>
                  <Switch
                    checked={user.isAdmin === true}
                    onCheckedChange={(checked) => 
                      toggleAdminMutation.mutate({ userId: user.id, isAdmin: checked })
                    }
                    disabled={toggleAdminMutation.isPending}
                    data-testid={`toggle-admin-${user.id}`}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={user.plan === 'pro'}
                    onCheckedChange={(checked) => 
                      toggleProMutation.mutate({ userId: user.id, isPro: checked })
                    }
                    disabled={toggleProMutation.isPending}
                    data-testid={`toggle-pro-${user.id}`}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminTopics() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const limit = 20;
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const dateParams = [
    startDate ? `startDate=${startDate.toISOString()}` : '',
    endDate ? `endDate=${endDate.toISOString()}` : ''
  ].filter(Boolean).join('&');
  const dateQueryString = dateParams ? `&${dateParams}` : '';

  const { data, isLoading } = useQuery<TopicsResponse>({
    queryKey: [`/api/admin/topics?limit=${limit}&offset=${page * limit}${dateQueryString}`],
  });

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(0);
  };

  const updateTopicMutation = useMutation({
    mutationFn: async ({ topicId, updates }: { topicId: string; updates: { isSample?: boolean; isPublic?: boolean } }) => {
      return apiRequest('PATCH', `/api/admin/topics/${topicId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/topics')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/sample-topics'] });
      toast({ title: "Topic updated", description: "Topic settings changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update topic.", variant: "destructive" });
    },
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      return apiRequest('DELETE', `/api/admin/topics/${topicId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && query.queryKey[0].startsWith('/api/admin/topics')
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
      toast({ title: "Topic deleted", description: "Topic has been permanently deleted." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete topic.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const topics = data?.topics || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Content Management
            </CardTitle>
            <CardDescription>
              Showing {topics.length} of {total} topics
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Filter by creation date:</span>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={(d) => { setStartDate(d); setPage(0); }}
              onEndDateChange={(d) => { setEndDate(d); setPage(0); }}
            />
            {(startDate || endDate) && (
              <Button variant="outline" size="sm" onClick={clearDateFilter} data-testid="button-clear-topic-date-filter">
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Public</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topics.map((topic) => (
              <TableRow key={topic.id} data-testid={`topic-row-${topic.id}`}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {topic.title}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{topic.category || 'General'}</Badge>
                </TableCell>
                <TableCell className="capitalize">{topic.difficulty}</TableCell>
                <TableCell>
                  <Switch
                    checked={topic.isSample === true}
                    onCheckedChange={(checked) => 
                      updateTopicMutation.mutate({ topicId: topic.id, updates: { isSample: checked } })
                    }
                    disabled={updateTopicMutation.isPending}
                    data-testid={`toggle-sample-${topic.id}`}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={topic.isPublic === true}
                    onCheckedChange={(checked) => 
                      updateTopicMutation.mutate({ topicId: topic.id, updates: { isPublic: checked } })
                    }
                    disabled={updateTopicMutation.isPending}
                    data-testid={`toggle-public-${topic.id}`}
                  />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {topic.createdAt ? format(new Date(topic.createdAt), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
                        deleteTopicMutation.mutate(topic.id);
                      }
                    }}
                    disabled={deleteTopicMutation.isPending}
                    data-testid={`delete-topic-${topic.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdminRevenue() {
  const [page, setPage] = useState(0);
  const limit = 20;
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

  const dateParams = [
    startDate ? `startDate=${startDate.toISOString()}` : '',
    endDate ? `endDate=${endDate.toISOString()}` : ''
  ].filter(Boolean).join('&');
  const dateQueryString = dateParams ? `&${dateParams}` : '';

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ['/api/admin/stats'],
  });

  const { data, isLoading } = useQuery<PurchasesResponse>({
    queryKey: [`/api/admin/purchases?limit=${limit}&offset=${page * limit}${dateQueryString}`],
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const clearDateFilter = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const purchases = data?.purchases || [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range Filter
            </CardTitle>
            <CardDescription>Filter purchases by date range</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            <Button variant="outline" size="sm" onClick={clearDateFilter} data-testid="button-clear-date-filter">
              Clear
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Topic Sales</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.topicPurchases || 0}
            </div>
            <p className="text-xs text-muted-foreground">@ $1.99 each</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pro Subscriptions</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.proSubscriptions || 0}
            </div>
            <p className="text-xs text-muted-foreground">@ $99/year</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Topic Purchases
          </CardTitle>
          <CardDescription>
            Latest topic purchase transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No purchases yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Topic ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((purchase) => (
                  <TableRow key={purchase.id} data-testid={`purchase-row-${purchase.id}`}>
                    <TableCell className="font-mono text-sm max-w-[120px] truncate">
                      {purchase.userId}
                    </TableCell>
                    <TableCell className="font-mono text-sm max-w-[120px] truncate">
                      {purchase.topicId}
                    </TableCell>
                    <TableCell>{formatCurrency(purchase.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={purchase.status === 'completed' ? 'default' : 'secondary'}>
                        {purchase.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {purchase.purchasedAt 
                        ? format(new Date(purchase.purchasedAt), 'MMM d, yyyy HH:mm')
                        : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: adminCheck, isLoading: adminCheckLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ['/api/admin/check'],
    enabled: isAuthenticated,
  });

  if (authLoading || adminCheckLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Admin Access Required
            </CardTitle>
            <CardDescription>
              Please sign in to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/api/login'} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!adminCheck?.isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have admin privileges to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} variant="outline" className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="admin-title">
          <LayoutDashboard className="h-8 w-8" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage users, content, and view platform analytics
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
          <TabsTrigger value="overview" data-testid="tab-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            Users
          </TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics">
            Topics
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            Revenue
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" id="overview">
          <AdminOverview />
        </TabsContent>

        <TabsContent value="users" id="users">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="topics" id="topics">
          <AdminTopics />
        </TabsContent>

        <TabsContent value="revenue" id="revenue">
          <AdminRevenue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
