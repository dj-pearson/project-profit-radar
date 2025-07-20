import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Activity, 
  Globe, 
  Clock,
  TrendingUp,
  Eye,
  Settings,
  RefreshCw
} from "lucide-react";

interface DosProtectionSettings {
  enabled: boolean;
  auto_block_threshold: number;
  block_duration_hours: number;
  detection_window_minutes: number;
  whitelist_enabled: boolean;
  geo_blocking_enabled: boolean;
  challenge_response_enabled: boolean;
}

interface BlockedIP {
  ip_address: string;
  reason: string;
  blocked_at: string;
  expires_at: string;
  country?: string;
  attack_count: number;
}

interface AttackMetrics {
  total_attacks_24h: number;
  blocked_ips_count: number;
  top_attack_types: Array<{ type: string; count: number }>;
  current_threat_level: 'low' | 'medium' | 'high' | 'critical';
}

export default function DosProtection() {
  const [settings, setSettings] = useState<DosProtectionSettings>({
    enabled: true,
    auto_block_threshold: 100,
    block_duration_hours: 24,
    detection_window_minutes: 5,
    whitelist_enabled: false,
    geo_blocking_enabled: false,
    challenge_response_enabled: false,
  });
  
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [attackMetrics, setAttackMetrics] = useState<AttackMetrics>({
    total_attacks_24h: 0,
    blocked_ips_count: 0,
    top_attack_types: [],
    current_threat_level: 'low',
  });
  
  const [whitelistIP, setWhitelistIP] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDosSettings();
    fetchBlockedIPs();
    fetchAttackMetrics();
  }, []);

  const fetchDosSettings = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dos-protection', {
        body: { action: 'get_settings' }
      });
      
      if (error) throw error;
      if (data?.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching DOS settings:', error);
    }
  };

  const fetchBlockedIPs = async () => {
    try {
      const { data, error } = await supabase
        .from('ip_access_control')
        .select('*')
        .eq('access_type', 'blacklist')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBlockedIPs(data || []);
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
    }
  };

  const fetchAttackMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dos-protection', {
        body: { action: 'get_metrics' }
      });
      
      if (error) throw error;
      if (data?.metrics) {
        setAttackMetrics(data.metrics);
      }
    } catch (error) {
      console.error('Error fetching attack metrics:', error);
    }
  };

  const updateSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'update_settings',
          settings 
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Settings Updated",
        description: "DOS protection settings have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update DOS protection settings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const blockIP = async (ipAddress: string, reason: string = "Manual block") => {
    try {
      const { error } = await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'block_ip',
          ip_address: ipAddress,
          reason 
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "IP Blocked",
        description: `Successfully blocked ${ipAddress}`,
      });
      
      fetchBlockedIPs();
    } catch (error) {
      toast({
        title: "Block Failed",
        description: "Failed to block IP address.",
        variant: "destructive",
      });
    }
  };

  const unblockIP = async (ipAddress: string) => {
    try {
      const { error } = await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'unblock_ip',
          ip_address: ipAddress 
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "IP Unblocked",
        description: `Successfully unblocked ${ipAddress}`,
      });
      
      fetchBlockedIPs();
    } catch (error) {
      toast({
        title: "Unblock Failed",
        description: "Failed to unblock IP address.",
        variant: "destructive",
      });
    }
  };

  const addToWhitelist = async () => {
    if (!whitelistIP) return;
    
    try {
      const { error } = await supabase.functions.invoke('dos-protection', {
        body: { 
          action: 'whitelist_ip',
          ip_address: whitelistIP 
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "IP Whitelisted",
        description: `Successfully whitelisted ${whitelistIP}`,
      });
      
      setWhitelistIP("");
    } catch (error) {
      toast({
        title: "Whitelist Failed",
        description: "Failed to whitelist IP address.",
        variant: "destructive",
      });
    }
  };

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Protection Status</p>
                <p className="text-2xl font-bold">
                  {settings.enabled ? "ACTIVE" : "DISABLED"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Attacks (24h)</p>
                <p className="text-2xl font-bold">{attackMetrics.total_attacks_24h}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Ban className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-medium">Blocked IPs</p>
                <p className="text-2xl font-bold">{attackMetrics.blocked_ips_count}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Threat Level</p>
                <Badge className={getThreatLevelColor(attackMetrics.current_threat_level)}>
                  {attackMetrics.current_threat_level.toUpperCase()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="blocked">Blocked IPs</TabsTrigger>
          <TabsTrigger value="whitelist">Whitelist</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                DOS Protection Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  These settings control how the system detects and prevents denial-of-service attacks.
                  Changes take effect immediately.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="enabled">Enable DOS Protection</Label>
                    <Switch
                      id="enabled"
                      checked={settings.enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, enabled: checked }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="threshold">Auto-Block Threshold (requests)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      value={settings.auto_block_threshold}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          auto_block_threshold: parseInt(e.target.value) 
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Block Duration (hours)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={settings.block_duration_hours}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          block_duration_hours: parseInt(e.target.value) 
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="window">Detection Window (minutes)</Label>
                    <Input
                      id="window"
                      type="number"
                      value={settings.detection_window_minutes}
                      onChange={(e) => 
                        setSettings(prev => ({ 
                          ...prev, 
                          detection_window_minutes: parseInt(e.target.value) 
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="whitelist">Whitelist Protection</Label>
                    <Switch
                      id="whitelist"
                      checked={settings.whitelist_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, whitelist_enabled: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="geo">Geographic Blocking</Label>
                    <Switch
                      id="geo"
                      checked={settings.geo_blocking_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, geo_blocking_enabled: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="challenge">Challenge Response</Label>
                    <Switch
                      id="challenge"
                      checked={settings.challenge_response_enabled}
                      onCheckedChange={(checked) => 
                        setSettings(prev => ({ ...prev, challenge_response_enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={updateSettings} disabled={loading} className="w-full">
                {loading ? "Updating..." : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="blocked">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Blocked IP Addresses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter IP address to block"
                    value={whitelistIP}
                    onChange={(e) => setWhitelistIP(e.target.value)}
                  />
                  <Button onClick={() => blockIP(whitelistIP, "Manual block")}>
                    Block IP
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Blocked At</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedIPs.map((ip) => (
                      <TableRow key={ip.ip_address}>
                        <TableCell className="font-mono">{ip.ip_address}</TableCell>
                        <TableCell>{ip.reason}</TableCell>
                        <TableCell>{new Date(ip.blocked_at).toLocaleString()}</TableCell>
                        <TableCell>{new Date(ip.expires_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblockIP(ip.ip_address)}
                          >
                            Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="whitelist">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                IP Whitelist Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Globe className="h-4 w-4" />
                  <AlertDescription>
                    Whitelisted IPs are never blocked, even if they exceed rate limits.
                    Use carefully and only for trusted sources.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter IP address to whitelist"
                    value={whitelistIP}
                    onChange={(e) => setWhitelistIP(e.target.value)}
                  />
                  <Button onClick={addToWhitelist}>
                    Add to Whitelist
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Real-time Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Attack Patterns</h3>
                  <Button variant="outline" size="sm" onClick={fetchAttackMetrics}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>

                <div className="space-y-3">
                  {attackMetrics.top_attack_types.map((attack, index) => (
                    <div key={attack.type} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-red-500" />
                        <span className="font-medium">{attack.type}</span>
                      </div>
                      <Badge variant="secondary">{attack.count} attacks</Badge>
                    </div>
                  ))}
                </div>

                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    Monitoring data is updated every minute. Historical data is retained for 30 days.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}