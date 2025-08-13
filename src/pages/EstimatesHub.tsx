import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Plus, Search, Filter, FileText, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EstimateForm } from "@/components/estimates/EstimateForm";
import { EstimatesTable } from "@/components/estimates/EstimatesTable";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function EstimatesHub() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const location = useLocation();

  const handleCreateEstimate = () => {
    setIsCreateDialogOpen(true);
  };

  const handleEstimateCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Estimate Created",
      description: "New estimate has been created successfully.",
    });
  };

  // LEAN Navigation: Auto-open estimate form from opportunity
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const opportunityId = urlParams.get('opportunity');
    
    if (opportunityId) {
      setIsCreateDialogOpen(true);
    }
  }, [location.search]);

  return (
    <DashboardLayout title="Estimates">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <p className="text-muted-foreground mt-1">
            Create, manage, and track construction estimates
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreateEstimate} className="gap-2">
              <Plus className="h-4 w-4" />
              New Estimate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Estimate</DialogTitle>
            </DialogHeader>
            <EstimateForm 
              onSuccess={handleEstimateCreated}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimates</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">
                +3 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$285,400</div>
              <p className="text-xs text-muted-foreground">
                Across 8 estimates
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">72%</div>
              <p className="text-xs text-muted-foreground">
                Last 90 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Response Time</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5.2 days</div>
              <p className="text-xs text-muted-foreground">
                Improvement from 7.1 days
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search estimates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="viewed">Viewed</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">All Estimates</TabsTrigger>
            <TabsTrigger value="draft">
              Draft
              <Badge variant="secondary" className="ml-2">3</Badge>
            </TabsTrigger>
            <TabsTrigger value="sent">
              Sent
              <Badge variant="outline" className="ml-2">8</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending
              <Badge variant="outline" className="ml-2">5</Badge>
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Accepted
              <Badge variant="default" className="ml-2">8</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <EstimatesTable 
              searchTerm={searchTerm}
              statusFilter={statusFilter}
            />
          </TabsContent>

          <TabsContent value="draft" className="mt-6">
            <EstimatesTable 
              searchTerm={searchTerm}
              statusFilter="draft"
            />
          </TabsContent>

          <TabsContent value="sent" className="mt-6">
            <EstimatesTable 
              searchTerm={searchTerm}
              statusFilter="sent"
            />
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <EstimatesTable 
              searchTerm={searchTerm}
              statusFilter="viewed"
            />
          </TabsContent>

          <TabsContent value="accepted" className="mt-6">
            <EstimatesTable 
              searchTerm={searchTerm}
              statusFilter="accepted"
            />
          </TabsContent>
        </Tabs>
    </DashboardLayout>
  );
}