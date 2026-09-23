import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccessiblePageWrapper } from '@/components/accessibility/AccessiblePageWrapper';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { User, Bell, Shield, Palette, Camera, Save, Lock, Smartphone, ShieldCheck } from 'lucide-react';
import PrivacyControls from '@/components/legal/PrivacyControls';
import { useStorageUrl } from '@/lib/storage/useStorageUrl';

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  avatar_url: string;
}

interface NotificationPrefs {
  email_task_due: boolean;
  email_project_updates: boolean;
  email_daily_digest: boolean;
  email_weekly_summary: boolean;
  push_mentions: boolean;
  push_urgent: boolean;
}

interface DisplayPrefs {
  date_format: string;
  timezone: string;
}

const errorMessage = (err: unknown): string =>
  err && typeof err === 'object' && 'message' in err && typeof err.message === 'string' && err.message
    ? err.message
    : 'Something went wrong. Please try again.';

const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-6">
      <Skeleton className="h-24 w-24 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
    <Skeleton className="h-10 w-full" />
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  </div>
);

const UserProfile = () => {
  const { user, userProfile, refreshProfile, sendOTP } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '', last_name: '', email: '', phone: '', avatar_url: '',
  });
  const [notifications, setNotifications] = useState<NotificationPrefs>({
    email_task_due: true, email_project_updates: true, email_daily_digest: false,
    email_weekly_summary: true, push_mentions: true, push_urgent: true,
  });
  const [display, setDisplay] = useState<DisplayPrefs>({
    date_format: 'MM/DD/YYYY', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [passwordForm, setPasswordForm] = useState({ code: '', new_password: '', confirm: '' });
  // Set once the reauthentication code has been emailed (US-347).
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) return;
    setProfile({
      first_name: userProfile.first_name || '',
      last_name: userProfile.last_name || '',
      email: userProfile.email || user?.email || '',
      phone: userProfile.phone || '',
      avatar_url: userProfile.avatar_url || '',
    });
    setLoading(false);
  }, [userProfile, user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })
        // user_profiles is keyed by id (= auth user id); it has no user_id
        // column, and filtering on one made PostgREST 400 every save (US-362).
        .eq('id', user.id)
        .select('id');

      if (error) throw error;
      // RLS hides a row it will not let you touch instead of erroring, so an
      // empty result is a failed save, not a successful one.
      if (!data || data.length === 0) throw new Error('No profile row was updated.');
      await refreshProfile();
      toast({ title: 'Profile updated', description: 'Your profile has been saved.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not save profile', description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Avatars live in a private bucket, so the signed URL is minted at render
  // time. Handles both a stored path and a legacy public URL (US-289).
  const { url: avatarUrl } = useStorageUrl('avatars', profile.avatar_url);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Persist the storage path, not a permanent public URL (US-289).
      // Avatars are personal data and the bucket is not world-readable.
      const { data: updated, error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: path })
        .eq('id', user.id)
        .select('id');

      if (updateError) throw updateError;
      if (!updated || updated.length === 0) throw new Error('No profile row was updated.');

      setProfile(prev => ({ ...prev, avatar_url: path }));
      await refreshProfile();
      toast({ title: 'Avatar updated', description: 'Your profile photo has been updated.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Upload failed', description: errorMessage(err) });
    }
  };

  // Step 1 of a password change: check the new password locally, then email
  // a reauthentication code. The change itself happens on the server, in
  // change-password, which will not act without that code (US-347).
  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 8 characters.' });
      return;
    }
    const email = user?.email;
    if (!email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Your account has no email address to send a code to.' });
      return;
    }
    try {
      setSaving(true);
      const { error } = await sendOTP({ email, type: 'reauthentication' });
      if (error) throw new Error(error);
      setCodeSentTo(email);
      toast({ title: 'Check your email', description: `We sent a 6-digit code to ${email}.` });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Could not send code', description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  // Step 2: the server verifies the code, changes the password and ends every
  // other session. signOut({ scope: 'others' }) repeats that last part from
  // this side, in case the server-side revocation failed.
  const handleConfirmPasswordChange = async () => {
    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { otpCode: passwordForm.code.trim(), newPassword: passwordForm.new_password },
      });
      if (error) {
        // FunctionsHttpError carries the response; surface the server's reason.
        const context = (error as { context?: Response }).context;
        const body = context && typeof context.json === 'function' ? await context.json().catch(() => null) : null;
        throw new Error(body?.error || error.message);
      }
      if (!data?.success) throw new Error(data?.error || 'Password was not changed.');

      const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
      setPasswordForm({ code: '', new_password: '', confirm: '' });
      setCodeSentTo(null);
      toast({
        title: 'Password changed',
        description: signOutError
          ? 'Your password was updated, but other devices could not be signed out. Sign out everywhere from Security settings.'
          : 'Your password was updated and your other devices were signed out.',
      });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Password not changed', description: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'U';

  if (loading) {
    return (
      <AccessiblePageWrapper pageTitle="My Profile">
        <DashboardLayout title="My Profile" hasAccessibleWrapper>
          <ProfileSkeleton />
        </DashboardLayout>
      </AccessiblePageWrapper>
    );
  }

  return (
    <AccessiblePageWrapper pageTitle="My Profile">
      <DashboardLayout title="My Profile" hasAccessibleWrapper>
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Avatar and Name Header */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl ?? undefined} alt={`${profile.first_name} ${profile.last_name}`} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload avatar"
              >
                <Camera className="h-4 w-4" aria-hidden="true" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h2>
              <p className="text-muted-foreground">{profile.email}</p>
              {userProfile?.role && (
                <p className="text-sm text-muted-foreground capitalize">{userProfile.role.replace('_', ' ')}</p>
              )}
            </div>
          </div>

          <Tabs defaultValue="personal" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="personal" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1 hidden sm:inline" aria-hidden="true" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="notifications" className="text-xs sm:text-sm">
                <Bell className="h-4 w-4 mr-1 hidden sm:inline" aria-hidden="true" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="display" className="text-xs sm:text-sm">
                <Palette className="h-4 w-4 mr-1 hidden sm:inline" aria-hidden="true" />
                Display
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs sm:text-sm">
                <Shield className="h-4 w-4 mr-1 hidden sm:inline" aria-hidden="true" />
                Security
              </TabsTrigger>
              <TabsTrigger value="privacy" className="text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4 mr-1 hidden sm:inline" aria-hidden="true" />
                Privacy
              </TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Update your personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profile.first_name}
                        onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profile.last_name}
                        onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={profile.email} disabled aria-describedby="email-help" />
                    <p id="email-help" className="text-xs text-muted-foreground">Email cannot be changed here</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleSaveProfile} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium mb-3">Email Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'email_task_due' as const, label: 'Task due reminders' },
                        { key: 'email_project_updates' as const, label: 'Project updates' },
                        { key: 'email_daily_digest' as const, label: 'Daily digest' },
                        { key: 'email_weekly_summary' as const, label: 'Weekly summary' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <Label htmlFor={item.key}>{item.label}</Label>
                          <Switch
                            id={item.key}
                            checked={notifications[item.key]}
                            onCheckedChange={v => setNotifications(n => ({ ...n, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium mb-3">Push Notifications</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'push_mentions' as const, label: 'Mentions & replies' },
                        { key: 'push_urgent' as const, label: 'Urgent alerts' },
                      ].map(item => (
                        <div key={item.key} className="flex items-center justify-between">
                          <Label htmlFor={item.key}>{item.label}</Label>
                          <Switch
                            id={item.key}
                            checked={notifications[item.key]}
                            onCheckedChange={v => setNotifications(n => ({ ...n, [item.key]: v }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Display Tab */}
            <TabsContent value="display">
              <Card>
                <CardHeader>
                  <CardTitle>Display Preferences</CardTitle>
                  <CardDescription>Customize how the app looks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Theme</Label>
                      <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                    </div>
                    <Select value={theme} onValueChange={(v: 'light' | 'dark') => setTheme(v)}>
                      <SelectTrigger className="w-32" aria-label="Select theme">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Date Format</Label>
                      <p className="text-sm text-muted-foreground">Choose your preferred date format</p>
                    </div>
                    <Select value={display.date_format} onValueChange={v => setDisplay(d => ({ ...d, date_format: v }))}>
                      <SelectTrigger className="w-40" aria-label="Select date format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Timezone</Label>
                      <p className="text-sm text-muted-foreground">Your current timezone</p>
                    </div>
                    <Select value={display.timezone} onValueChange={v => setDisplay(d => ({ ...d, timezone: v }))}>
                      <SelectTrigger className="w-56" aria-label="Select timezone">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific (PT)</SelectItem>
                        <SelectItem value="America/Anchorage">Alaska (AKT)</SelectItem>
                        <SelectItem value="Pacific/Honolulu">Hawaii (HT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                      placeholder="Confirm new password"
                    />
                  </div>
                  {codeSentTo ? (
                    <div className="space-y-2">
                      <Label htmlFor="reauth_code">Code sent to {codeSentTo}</Label>
                      <Input
                        id="reauth_code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={passwordForm.code}
                        onChange={e => setPasswordForm(p => ({ ...p, code: e.target.value.replace(/\D/g, '') }))}
                        placeholder="6-digit code"
                      />
                      <div className="flex gap-2">
                        <Button onClick={handleConfirmPasswordChange} disabled={saving || passwordForm.code.length !== 6}>
                          <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                          {saving ? 'Changing...' : 'Confirm Password Change'}
                        </Button>
                        <Button variant="outline" onClick={handleChangePassword} disabled={saving}>
                          Send a new code
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button onClick={handleChangePassword} disabled={saving || !passwordForm.new_password}>
                      <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                      {saving ? 'Sending code...' : 'Change Password'}
                    </Button>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium">Multi-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" onClick={() => window.location.href = '/security-settings'}>
                      <Smartphone className="h-4 w-4 mr-2" aria-hidden="true" />
                      Setup MFA
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy / DSAR self-service tab — exposes the rights described
                in the Privacy Policy: data export, account deletion, and
                granular tracking preferences. */}
            <TabsContent value="privacy">
              <PrivacyControls />
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </AccessiblePageWrapper>
  );
};

export default UserProfile;
