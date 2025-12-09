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
  Shield, Crown, Trash2, LayoutDashboard, Calendar,
  MessageSquare, AlertCircle, Clock, CheckCircle2, Loader2, Send
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import type { User, Topic, TopicPurchase, SupportRequest, SupportMessage } from "@shared/schema";

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

interface SupportRequestsResponse {
  requests: SupportRequest[];
  total: number;
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

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof Clock }> = {
  open: { label: "Open", variant: "default", icon: Clock },
  in_progress: { label: "In Progress", variant: "secondary", icon: Loader2 },
  resolved: { label: "Resolved", variant: "outline", icon: CheckCircle2 },
  closed: { label: "Closed", variant: "outline", icon: CheckCircle2 },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  low: { label: "Low", className: "text-muted-foreground" },
  normal: { label: "Normal", className: "text-foreground" },
  high: { label: "High", className: "text-orange-600 dark:text-orange-400" },
  critical: { label: "Critical", className: "text-red-600 dark:text-red-400" },
};

const typeConfig: Record<string, { label: string; icon: typeof MessageSquare }> = {
  support: { label: "Support", icon: AlertCircle },
  bug: { label: "Bug Report", icon: AlertCircle },
  feature: { label: "Feature Request", icon: MessageSquare },
  feedback: { label: "Feedback", icon: MessageSquare },
};

function AdminSupport() {
  const { toast } = useToast();
  const [page, setPage] = useState(0);
  const limit = 20;
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);
  const [replyMessage, setReplyMessage] = useState("");

  const filterParams = [
    statusFilter ? `status=${statusFilter}` : '',
    typeFilter ? `type=${typeFilter}` : '',
    priorityFilter ? `priority=${priorityFilter}` : '',
    startDate ? `startDate=${startDate.toISOString()}` : '',
    endDate ? `endDate=${endDate.toISOString()}` : ''
  ].filter(Boolean).join('&');
  const filterQueryString = filterParams ? `&${filterParams}` : '';

  const { data, isLoading, refetch } = useQuery<SupportRequestsResponse>({
    queryKey: [`/api/admin/support?limit=${limit}&offset=${page * limit}${filterQueryString}`],
  });

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery<SupportMessage[]>({
    queryKey: [`/api/support/${selectedRequest?.id}/messages`],
    enabled: !!selectedRequest,
  });

  const { data: adminUsers } = useQuery<User[]>({
    queryKey: ['/api/admin/admins'],
  });

  const updateRequestMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      return apiRequest('PATCH', `/api/admin/support/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support'] });
      refetch();
      toast({ title: "Request updated", description: "The support request has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      return apiRequest('POST', `/api/support/${id}/messages`, { message });
    },
    onSuccess: () => {
      setReplyMessage("");
      refetchMessages();
      toast({ title: "Reply sent", description: "Your reply has been sent." });
    },
    onError: (error: any) => {
      toast({ title: "Failed to send reply", description: error.message, variant: "destructive" });
    },
  });

  const clearFilters = () => {
    setStatusFilter("");
    setTypeFilter("");
    setPriorityFilter("");
    setStartDate(undefined);
    setEndDate(undefined);
    setPage(0);
  };

  const hasFilters = statusFilter || typeFilter || priorityFilter || startDate || endDate;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Requests
            </CardTitle>
            <CardDescription>
              Manage user support tickets, feedback, and feature requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(0); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(0); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-type-filter">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(val) => { setPriorityFilter(val); setPage(0); }}>
                <SelectTrigger className="w-[140px]" data-testid="select-priority-filter">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>

              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={(date) => { setStartDate(date); setPage(0); }}
                onEndDateChange={(date) => { setEndDate(date); setPage(0); }}
              />

              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-support-filters">
                  Clear Filters
                </Button>
              )}
            </div>

            {data?.requests && data.requests.length > 0 ? (
              <div className="space-y-3">
                {data.requests.map((request) => {
                  const status = statusConfig[request.status || 'open'];
                  const priority = priorityConfig[request.priority || 'normal'];
                  const type = typeConfig[request.type || 'support'];
                  const isSelected = selectedRequest?.id === request.id;
                  
                  return (
                    <div
                      key={request.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-muted/50' : 'hover-elevate'}`}
                      onClick={() => setSelectedRequest(request)}
                      data-testid={`card-support-${request.id}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {type.label}
                          </Badge>
                          <span className={`text-xs font-medium ${priority.className}`}>
                            {priority.label}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {request.createdAt ? format(new Date(request.createdAt), 'MMM d, yyyy HH:mm') : 'N/A'}
                        </span>
                      </div>
                      <h3 className="font-medium mb-1">{request.subject}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{request.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No support requests found</p>
              </div>
            )}

            {data && data.total > limit && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  data-testid="button-support-prev"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(data.total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= data.total}
                  data-testid="button-support-next"
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        {selectedRequest ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Request Details</CardTitle>
              <CardDescription>{selectedRequest.subject}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{selectedRequest.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Select
                    value={selectedRequest.status || 'open'}
                    onValueChange={(val) => updateRequestMutation.mutate({ id: selectedRequest.id, updates: { status: val } })}
                  >
                    <SelectTrigger className="w-[130px] h-8" data-testid="select-update-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Priority</span>
                  <Select
                    value={selectedRequest.priority || 'normal'}
                    onValueChange={(val) => updateRequestMutation.mutate({ id: selectedRequest.id, updates: { priority: val } })}
                  >
                    <SelectTrigger className="w-[130px] h-8" data-testid="select-update-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Assigned To</span>
                  <Select
                    value={selectedRequest.assignedAdminId || "unassigned"}
                    onValueChange={(val) => updateRequestMutation.mutate({ id: selectedRequest.id, updates: { assignedAdminId: val === "unassigned" ? null : val } })}
                  >
                    <SelectTrigger className="w-[130px] h-8" data-testid="select-assign-admin">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {adminUsers?.map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          {admin.firstName || admin.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedRequest.description}
                </p>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Messages</h4>
                {messagesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : messages && messages.length > 0 ? (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg text-sm ${msg.authorType === 'admin' ? 'bg-primary/10 ml-4' : 'bg-muted mr-4'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-xs">
                            {msg.authorType === 'admin' ? 'Admin' : 'User'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {msg.createdAt ? format(new Date(msg.createdAt), 'MMM d, HH:mm') : ''}
                          </span>
                        </div>
                        <p>{msg.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No messages yet</p>
                )}
              </div>

              <div className="pt-4 border-t">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  className="mb-2"
                  data-testid="textarea-admin-reply"
                />
                <Button
                  size="sm"
                  onClick={() => sendMessageMutation.mutate({ id: selectedRequest.id, message: replyMessage })}
                  disabled={!replyMessage.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-reply"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a request to view details</p>
            </CardContent>
          </Card>
        )}
      </div>
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
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
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
          <TabsTrigger value="support" data-testid="tab-support">
            Support
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

        <TabsContent value="support" id="support">
          <AdminSupport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
