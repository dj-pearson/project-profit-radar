import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Phone, 
  Mail, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Lead {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
}

interface CallLog {
  id: string;
  phone_number: string;
  status: string;
  duration: number | null;
  created_at: string;
}

interface Booking {
  id: string;
  attendee_name: string;
  scheduled_at: string;
  status: string;
  booking_pages: { title: string };
}

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
}

export function CRMDashboard() {
  const { data: leads } = useQuery({
    queryKey: ["recent-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Lead[];
    },
  });

  const { data: calls } = useQuery({
    queryKey: ["recent-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as CallLog[];
    },
  });

  const { data: bookings } = useQuery({
    queryKey: ["upcoming-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, booking_pages(title)")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as Booking[];
    },
  });

  const { data: deals } = useQuery({
    queryKey: ["active-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .neq("stage", "closed_won")
        .neq("stage", "closed_lost")
        .order("value", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as Deal[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["crm-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [leadsCount, dealsValue, callsToday, bookingsToday] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase.from("deals").select("value").eq("stage", "closed_won"),
        supabase
          .from("call_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true })
          .gte("scheduled_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
          .lt("scheduled_at", new Date(new Date().setHours(23, 59, 59, 999)).toISOString()),
      ]);

      const totalDealsValue = dealsValue.data?.reduce((sum, deal) => sum + (deal.value || 0), 0) || 0;

      return {
        totalLeads: leadsCount.count || 0,
        totalDealsValue,
        callsToday: callsToday.count || 0,
        bookingsToday: bookingsToday.count || 0,
      };
    },
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      qualified: "bg-purple-500",
      converted: "bg-green-500",
      completed: "bg-green-500",
      confirmed: "bg-green-500",
      pending: "bg-yellow-500",
      cancelled: "bg-red-500",
      no_show: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-muted-foreground">Overview of your sales activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
            <p className="text-xs text-muted-foreground">Active in pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deals Won</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${((stats?.totalDealsValue || 0) / 1000).toFixed(1)}k
            </div>
            <p className="text-xs text-muted-foreground">Total closed value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Today</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.callsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Outbound & inbound</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.bookingsToday || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled bookings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList>
          <TabsTrigger value="leads">Recent Leads</TabsTrigger>
          <TabsTrigger value="calls">Call Activity</TabsTrigger>
          <TabsTrigger value="meetings">Upcoming Meetings</TabsTrigger>
          <TabsTrigger value="deals">Active Deals</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Leads</CardTitle>
                  <CardDescription>Latest leads added to your pipeline</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/leads">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leads?.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-sm text-muted-foreground">{lead.email}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(lead.created_at), "MMM d")}
                      </span>
                    </div>
                  </div>
                ))}
                {!leads || leads.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No leads yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Calls</CardTitle>
                  <CardDescription>Your latest call activity</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/calls">View History</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {calls?.map((call) => (
                  <div key={call.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{call.phone_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {call.duration ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s` : "No answer"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={call.status === "completed" ? "default" : "secondary"}>
                        {call.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(call.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
                {!calls || calls.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No calls yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Meetings</CardTitle>
                  <CardDescription>Your scheduled bookings</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/bookings">Manage Bookings</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bookings?.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{booking.attendee_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {booking.booking_pages?.title || "Meeting"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(booking.scheduled_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
                {!bookings || bookings.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No upcoming meetings</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deals" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Deals</CardTitle>
                  <CardDescription>Deals in your pipeline</CardDescription>
                </div>
                <Button asChild>
                  <Link to="/deals">View Pipeline</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deals?.map((deal) => (
                  <div key={deal.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                    <div className="space-y-1">
                      <div className="font-medium">{deal.title}</div>
                      <div className="text-sm text-muted-foreground">{deal.stage}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold">${deal.value.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">{deal.probability}% probability</div>
                      </div>
                    </div>
                  </div>
                ))}
                {!deals || deals.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No active deals</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/leads/new">
              <Users className="mr-2 h-4 w-4" />
              Add Lead
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/meetings">
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Meeting
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/deals/new">
              <DollarSign className="mr-2 h-4 w-4" />
              Create Deal
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}