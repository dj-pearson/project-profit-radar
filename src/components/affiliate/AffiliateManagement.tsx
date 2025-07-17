import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Edit2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AffiliateProgram {
  id: string;
  name: string;
  referrer_reward_months: number;
  referee_reward_months: number;
  min_subscription_duration_months: number;
  is_active: boolean;
}

interface AffiliateCode {
  id: string;
  affiliate_code: string;
  company_id: string;
  total_referrals: number;
  successful_referrals: number;
  total_rewards_earned: number;
  is_active: boolean;
  companies: {
    name: string;
  };
}

const AffiliateManagement = () => {
  const { userProfile } = useAuth();
  const userRole = userProfile?.role;
  const [programs, setPrograms] = useState<AffiliateProgram[]>([]);
  const [affiliateCodes, setAffiliateCodes] = useState<AffiliateCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingProgram, setEditingProgram] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AffiliateProgram>>({});

  const isRootAdmin = userRole === 'root_admin';

  useEffect(() => {
    if (isRootAdmin) {
      fetchData();
    }
  }, [isRootAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('affiliate_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch affiliate codes with company names
      const { data: codesData, error: codesError } = await supabase
        .from('affiliate_codes')
        .select(`
          *,
          companies (
            name
          )
        `)
        .order('total_referrals', { ascending: false });

      if (codesError) throw codesError;
      setAffiliateCodes(codesData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("Failed to load affiliate data");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (program: AffiliateProgram) => {
    setEditingProgram(program.id);
    setEditForm(program);
  };

  const cancelEditing = () => {
    setEditingProgram(null);
    setEditForm({});
  };

  const saveProgram = async () => {
    if (!editingProgram || !editForm) return;

    try {
      const { error } = await supabase
        .from('affiliate_programs')
        .update({
          name: editForm.name,
          referrer_reward_months: editForm.referrer_reward_months,
          referee_reward_months: editForm.referee_reward_months,
          min_subscription_duration_months: editForm.min_subscription_duration_months,
          is_active: editForm.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProgram);

      if (error) throw error;

      toast.success("Program updated successfully");
      setEditingProgram(null);
      setEditForm({});
      fetchData();
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error("Failed to update program");
    }
  };

  const createNewProgram = async () => {
    try {
      const { error } = await supabase
        .from('affiliate_programs')
        .insert({
          name: 'New Program',
          referrer_reward_months: 1,
          referee_reward_months: 1,
          min_subscription_duration_months: 1,
          is_active: false
        });

      if (error) throw error;

      toast.success("New program created");
      fetchData();
    } catch (error) {
      console.error('Error creating program:', error);
      toast.error("Failed to create program");
    }
  };

  if (!isRootAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Management</CardTitle>
          <CardDescription>Access restricted to root administrators</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Program Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Affiliate Programs</CardTitle>
            <CardDescription>Manage referral program settings and rewards</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={createNewProgram} size="sm">
              Create Program
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {programs.map((program) => (
              <div key={program.id} className="border rounded-lg p-4">
                {editingProgram === program.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Program Name</Label>
                        <Input
                          id="name"
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editForm.is_active || false}
                          onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="referrer_reward">Referrer Reward (Months)</Label>
                        <Input
                          id="referrer_reward"
                          type="number"
                          min="0"
                          value={editForm.referrer_reward_months || 0}
                          onChange={(e) => setEditForm({ ...editForm, referrer_reward_months: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="referee_reward">Referee Reward (Months)</Label>
                        <Input
                          id="referee_reward"
                          type="number"
                          min="0"
                          value={editForm.referee_reward_months || 0}
                          onChange={(e) => setEditForm({ ...editForm, referee_reward_months: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="min_duration">Min Subscription (Months)</Label>
                        <Input
                          id="min_duration"
                          type="number"
                          min="1"
                          value={editForm.min_subscription_duration_months || 1}
                          onChange={(e) => setEditForm({ ...editForm, min_subscription_duration_months: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveProgram} size="sm">
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={cancelEditing} size="sm">
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{program.name}</h3>
                        <Badge variant={program.is_active ? "default" : "secondary"}>
                          {program.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                        <div>Referrer: {program.referrer_reward_months} months</div>
                        <div>Referee: {program.referee_reward_months} months</div>
                        <div>Min Duration: {program.min_subscription_duration_months} months</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(program)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Affiliate Codes Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliate Codes</CardTitle>
          <CardDescription>Overview of all company affiliate codes and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Total Referrals</TableHead>
                <TableHead>Successful</TableHead>
                <TableHead>Rewards Earned</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliateCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell className="font-medium">{code.companies?.name}</TableCell>
                  <TableCell className="font-mono">{code.affiliate_code}</TableCell>
                  <TableCell>{code.total_referrals}</TableCell>
                  <TableCell>{code.successful_referrals}</TableCell>
                  <TableCell>{code.total_rewards_earned} months</TableCell>
                  <TableCell>
                    <Badge variant={code.is_active ? "default" : "secondary"}>
                      {code.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateManagement;