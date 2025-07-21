import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AuthDebugInfo {
  frontendUser: any;
  frontendProfile: any;
  supabaseSession: any;
  supabaseUser: any;
  profileFromDB: any;
  canAccessBlogPosts: boolean;
  error: string | null;
}

export const AuthDebugComponent: React.FC = () => {
  const { user, userProfile } = useAuth();
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    const info: AuthDebugInfo = {
      frontendUser: null,
      frontendProfile: null,
      supabaseSession: null,
      supabaseUser: null,
      profileFromDB: null,
      canAccessBlogPosts: false,
      error: null
    };

    try {
      // 1. Frontend auth context
      info.frontendUser = user;
      info.frontendProfile = userProfile;

      // 2. Supabase session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      info.supabaseSession = sessionData.session;

      // 3. Supabase user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      info.supabaseUser = userData.user;

      // 4. Profile from database
      if (user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          info.error = `Profile error: ${profileError.message}`;
        } else {
          info.profileFromDB = profileData;
        }
      }

      // 5. Test blog posts access
      const { data: blogData, error: blogError } = await supabase
        .from('blog_posts')
        .select('count')
        .limit(1);
      
      if (blogError) {
        info.error = `Blog access error: ${blogError.message}`;
      } else {
        info.canAccessBlogPosts = true;
      }

    } catch (error: any) {
      info.error = error.message;
    }

    setDebugInfo(info);
    setLoading(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, [user, userProfile]);

  if (!debugInfo) {
    return <div>Loading auth debug info...</div>;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Authentication Debug Information</CardTitle>
        <CardDescription>
          Detailed authentication state for troubleshooting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostics} disabled={loading}>
          {loading ? 'Running Diagnostics...' : 'Refresh Diagnostics'}
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Frontend Auth Context</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              User: {JSON.stringify(debugInfo.frontendUser, null, 2)}
            </pre>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto mt-2">
              Profile: {JSON.stringify(debugInfo.frontendProfile, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Supabase Session</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              Session: {JSON.stringify(debugInfo.supabaseSession, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Supabase User</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              User: {JSON.stringify(debugInfo.supabaseUser, null, 2)}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Profile from Database</h3>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
              Profile: {JSON.stringify(debugInfo.profileFromDB, null, 2)}
            </pre>
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold mb-2">Access Status</h3>
          <div className="space-y-2">
            <div className={`p-2 rounded ${debugInfo.canAccessBlogPosts ? 'bg-green-100' : 'bg-red-100'}`}>
              Blog Posts Access: {debugInfo.canAccessBlogPosts ? '✅ Success' : '❌ Failed'}
            </div>
            {debugInfo.error && (
              <div className="p-2 bg-red-100 rounded">
                Error: {debugInfo.error}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 