import { useState, useEffect } from 'react';
import { AuthModal } from '@/components/auth/AuthModal';
import { MobileTestingEnvironment } from '@/components/mobile/MobileTestingEnvironment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LogOut, 
  User, 
  Building2, 
  Smartphone,
  Camera,
  MapPin,
  Clock,
  Users,
  Hammer,
  CheckCircle
} from 'lucide-react';

export const ConstructionDashboard = () => {
  const { user, userProfile, loading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShowAuth(true);
    } else {
      setShowAuth(false);
    }
  }, [loading, user]);

  const handleAuthSuccess = () => {
    setShowAuth(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to BuildDesk</CardTitle>
            <CardDescription>
              Construction management built for mobile field teams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowAuth(true)} className="w-full">
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">BuildDesk</h1>
                <p className="text-sm text-muted-foreground">Field Management</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">
                  {userProfile?.first_name} {userProfile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {userProfile?.role || 'crew_member'}
                </p>
              </div>
              
              <Button onClick={handleSignOut} variant="ghost" size="sm">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  Welcome back, {userProfile?.first_name || 'User'}!
                </CardTitle>
                <CardDescription>
                  Ready to manage your construction projects on mobile
                </CardDescription>
              </div>
              <Badge variant="secondary" className="capitalize">
                {userProfile?.role || 'crew_member'}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Feature Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Field Photos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Capture progress photos with GPS metadata
              </p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>GPS Location</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Time Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Clock in/out with location verification
              </p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Offline Support</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Hammer className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Material Tracking</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Scan and track material usage in real-time
              </p>
              <div className="flex items-center gap-2 text-xs">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Real-time Sync</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Testing Environment */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              <CardTitle>Mobile Testing Environment</CardTitle>
            </div>
            <CardDescription>
              Test and validate mobile features for construction field work
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MobileTestingEnvironment />
          </CardContent>
        </Card>

        {/* Profile Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Profile Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-sm">{user?.email}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Role</label>
                <p className="text-sm capitalize">{profile?.role || 'crew_member'}</p>
              </div>
              
              {profile?.company_id && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p className="text-sm">{profile.company_id}</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};