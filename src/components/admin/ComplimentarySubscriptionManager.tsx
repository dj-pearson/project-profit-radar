import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Gift, Clock, Ban, UserCheck, Calendar, AlertTriangle, Search, Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';

interface ComplimentarySubscription {
  id: string;
  user_email: string;
  subscription_tier: string;
  complimentary_type: string;
  granted_at: string;
  expires_at?: string;
  reason: string;
  granted_by_email?: string;
}

interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
}

const ComplimentarySubscriptionManager = () => {
  const [complimentarySubscriptions, setComplimentarySubscriptions] = useState<ComplimentarySubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [granting, setGranting] = useState(false);
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  
  // Form state
  const [userEmail, setUserEmail] = useState('');
  const [subscriptionTier, setSubscriptionTier] = useState<'starter' | 'professional' | 'enterprise'>('professional');
  const [complimentaryType, setComplimentaryType] = useState<'permanent' | 'temporary'>('temporary');
  const [durationMonths, setDurationMonths] = useState(1);
  const [reason, setReason] = useState('');

  // User search state
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const canManageComplimentary = hasPermission('admin_billing', 'manage');

  useEffect(() => {
    if (canManageComplimentary) {
      fetchComplimentarySubscriptions();
      fetchUsers();
    }
  }, [canManageComplimentary]);

  const fetchComplimentarySubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select(`
          id,
          email,
          subscription_tier,
          complimentary_type,
          complimentary_granted_at,
          complimentary_expires_at,
          complimentary_reason,
          user_profiles!inner(email)
        `)
        .eq('is_complimentary', true);

      if (error) throw error;

      const formatted = data?.map(sub => ({
        id: sub.id,
        user_email: sub.email,
        subscription_tier: sub.subscription_tier,
        complimentary_type: sub.complimentary_type,
        granted_at: sub.complimentary_granted_at,
        expires_at: sub.complimentary_expires_at,
        reason: sub.complimentary_reason,
      })) || [];

      setComplimentarySubscriptions(formatted);
    } catch (error) {
      console.error('Error fetching complimentary subscriptions:', error);
      toast({
        title: "Error",
        description: "Failed to load complimentary subscriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          companies!inner(name)
        `)
        .order('email');

      if (error) throw error;

      const formattedUsers = data?.map(user => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        company_name: user.companies?.[0]?.name
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleGrantComplimentary = async () => {
    const email = selectedUser?.email || userEmail;
    if (!email || !reason) {
      toast({
        title: "Validation Error",
        description: "Please select a user and provide a reason",
        variant: "destructive"
      });
      return;
    }

    setGranting(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-complimentary-subscription', {
        body: {
          action: 'grant',
          user_email: email,
          duration_months: complimentaryType === 'temporary' ? durationMonths : undefined,
          reason: reason,
          subscription_tier: subscriptionTier,
          type: complimentaryType
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      // Reset form
      setUserEmail('');
      setSelectedUser(null);
      setReason('');
      setDurationMonths(1);
      setShowGrantDialog(false);
      
      // Refresh list
      await fetchComplimentarySubscriptions();
    } catch (error) {
      console.error('Error granting complimentary subscription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant complimentary subscription",
        variant: "destructive"
      });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeComplimentary = async (userEmail: string, reason: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-complimentary-subscription', {
        body: {
          action: 'revoke',
          user_email: userEmail,
          reason: reason
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message,
      });

      await fetchComplimentarySubscriptions();
    } catch (error) {
      console.error('Error revoking complimentary subscription:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke complimentary subscription",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (subscription: ComplimentarySubscription) => {
    if (subscription.complimentary_type === 'permanent') {
      return <Badge className="bg-green-500 text-white">Permanent</Badge>;
    }

    if (subscription.complimentary_type === 'root_admin') {
      return <Badge className="bg-blue-500 text-white">Root Admin</Badge>;
    }

    if (subscription.expires_at) {
      const expiryDate = new Date(subscription.expires_at);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        return <Badge variant="destructive">Expired</Badge>;
      } else if (daysUntilExpiry <= 7) {
        return <Badge variant="secondary" className="border-orange-500 text-orange-700">Expires in {daysUntilExpiry} days</Badge>;
      }
      
      return <Badge variant="outline">Active ({daysUntilExpiry} days left)</Badge>;
    }

    return <Badge variant="outline">Active</Badge>;
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.company_name?.toLowerCase().includes(searchLower)
    );
  });

  if (!canManageComplimentary) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">
              You don't have permission to manage complimentary subscriptions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Complimentary Subscriptions</h2>
          <p className="text-muted-foreground">Manage free subscriptions for customers and staff</p>
        </div>
        
        <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
          <DialogTrigger asChild>
            <Button className="bg-construction-orange hover:bg-construction-orange/90">
              <Gift className="h-4 w-4 mr-2" />
              Grant Complimentary
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Grant Complimentary Subscription</DialogTitle>
              <DialogDescription>
                Provide a free subscription to a customer or team member.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-search">Select User *</Label>
                <Popover open={showUserSearch} onOpenChange={setShowUserSearch}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={showUserSearch}
                      className="w-full justify-between"
                    >
                      {selectedUser ? (
                        <span>
                          {selectedUser.email}
                          {selectedUser.first_name && selectedUser.last_name && (
                            <span className="text-muted-foreground ml-2">
                              ({selectedUser.first_name} {selectedUser.last_name})
                            </span>
                          )}
                        </span>
                      ) : (
                        "Search and select user..."
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search users by email, name, or company..." 
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {filteredUsers.slice(0, 50).map((user) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => {
                                setSelectedUser(user);
                                setUserEmail(user.email);
                                setShowUserSearch(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedUser?.id === user.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">{user.email}</span>
                                {(user.first_name || user.last_name || user.company_name) && (
                                  <span className="text-sm text-muted-foreground">
                                    {user.first_name} {user.last_name}
                                    {user.company_name && ` • ${user.company_name}`}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {/* Fallback manual email input */}
                <div className="mt-2">
                  <Label htmlFor="manual-email" className="text-sm text-muted-foreground">
                    Or enter email manually:
                  </Label>
                  <Input
                    id="manual-email"
                    type="email"
                    value={userEmail}
                    onChange={(e) => {
                      setUserEmail(e.target.value);
                      setSelectedUser(null);
                    }}
                    placeholder="user@example.com"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subscription-tier">Subscription Tier</Label>
                <Select value={subscriptionTier} onValueChange={(value) => setSubscriptionTier(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="complimentary-type">Type</Label>
                <Select value={complimentaryType} onValueChange={(value) => setComplimentaryType(value as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="temporary">Temporary</SelectItem>
                    <SelectItem value="permanent">Permanent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {complimentaryType === 'temporary' && (
                <div>
                  <Label htmlFor="duration">Duration (Months)</Label>
                  <Select value={durationMonths.toString()} onValueChange={(value) => setDurationMonths(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="2">2 Months</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="reason">Reason *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this complimentary subscription is being granted..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowGrantDialog(false)}
                  disabled={granting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGrantComplimentary}
                  disabled={granting}
                  className="bg-construction-orange hover:bg-construction-orange/90"
                >
                  {granting ? "Granting..." : "Grant Subscription"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-construction-orange" />
            Active Complimentary Subscriptions
          </CardTitle>
          <CardDescription>
            Users currently enjoying complimentary access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-construction-orange mx-auto mb-2"></div>
              <p className="text-muted-foreground">Loading subscriptions...</p>
            </div>
          ) : complimentarySubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Complimentary Subscriptions</h3>
              <p className="text-muted-foreground">
                Grant complimentary subscriptions to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Email</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Granted</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complimentarySubscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell className="font-medium">{subscription.user_email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {subscription.subscription_tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">{subscription.complimentary_type}</TableCell>
                    <TableCell>{getStatusBadge(subscription)}</TableCell>
                    <TableCell>
                      {new Date(subscription.granted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {subscription.expires_at 
                        ? new Date(subscription.expires_at).toLocaleDateString()
                        : 'Never'
                      }
                    </TableCell>
                    <TableCell>
                      {subscription.complimentary_type !== 'root_admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeComplimentary(subscription.user_email, 'Manually revoked by admin')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Revoke
                        </Button>
                      )}
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
};

export default ComplimentarySubscriptionManager;