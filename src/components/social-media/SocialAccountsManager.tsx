import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Settings, 
  Trash2, 
  RefreshCw,
  Facebook,
  Linkedin,
  Twitter,
  Instagram,
  ExternalLink,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SocialAccountsManagerProps {
  accounts: any[];
  onAccountUpdated: () => void;
}

export const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({
  accounts,
  onAccountUpdated
}) => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');

  const platformConfig = [
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: Linkedin, 
      color: 'bg-blue-600',
      description: 'Share professional updates and industry insights'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'bg-blue-500',
      description: 'Connect with local community and customers'
    },
    { 
      id: 'twitter', 
      name: 'Twitter/X', 
      icon: Twitter, 
      color: 'bg-black',
      description: 'Share quick updates and engage in conversations'
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: Instagram, 
      color: 'bg-gradient-to-r from-purple-500 to-pink-500',
      description: 'Showcase project photos and behind-the-scenes content'
    }
  ];

  const handleConnectAccount = async (platform: string) => {
    setIsConnecting(true);
    try {
      // This would typically initiate OAuth flow
      toast({
        title: "OAuth Flow",
        description: `Redirecting to ${platform} for authentication...`,
      });
      
      // For demo purposes, we'll simulate the connection
      setTimeout(() => {
        toast({
          title: "Account Connected",
          description: `Successfully connected ${platform} account`,
        });
        onAccountUpdated();
        setIsConnecting(false);
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Connection Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string, platform: string) => {
    try {
      // Would call API to disconnect account
      toast({
        title: "Account Disconnected",
        description: `${platform} account has been disconnected`,
      });
      onAccountUpdated();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    const config = platformConfig.find(p => p.id === platform.toLowerCase());
    if (!config) return ExternalLink;
    return config.icon;
  };

  const isConnected = (platform: string) => {
    return accounts.some(account => account.platform === platform && account.is_active);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Social Media Accounts</h2>
          <p className="text-muted-foreground">
            Connect and manage your social media accounts
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Connect Account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Social Media Account</DialogTitle>
              <DialogDescription>
                Choose a platform to connect to your BuildDesk account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {platformConfig.map((platform) => {
                const Icon = platform.icon;
                const connected = isConnected(platform.id);
                
                return (
                  <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${platform.color} text-white`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium">{platform.name}</h3>
                        <p className="text-sm text-muted-foreground">{platform.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {connected ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Button
                          onClick={() => handleConnectAccount(platform.id)}
                          disabled={isConnecting}
                          size="sm"
                        >
                          {isConnecting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Connected Accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account) => {
          const Icon = getPlatformIcon(account.platform);
          const platformInfo = platformConfig.find(p => p.id === account.platform);
          
          return (
            <Card key={account.id}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded ${platformInfo?.color || 'bg-gray-500'} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{account.account_name}</CardTitle>
                      <CardDescription className="capitalize">{account.platform}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={account.is_active ? "default" : "secondary"}>
                    {account.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Connected</p>
                    <p className="font-medium">
                      {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <div className="flex items-center gap-1">
                      {account.is_active ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-600">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => handleDisconnectAccount(account.id, account.platform)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No accounts connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your social media accounts to start managing your posts
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Connect Your First Account
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Social Media Account</DialogTitle>
                  <DialogDescription>
                    Choose a platform to connect to your BuildDesk account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {platformConfig.map((platform) => {
                    const Icon = platform.icon;
                    
                    return (
                      <div key={platform.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded ${platform.color} text-white`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-medium">{platform.name}</h3>
                            <p className="text-sm text-muted-foreground">{platform.description}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleConnectAccount(platform.id)}
                          disabled={isConnecting}
                          size="sm"
                        >
                          {isConnecting ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};