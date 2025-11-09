/**
 * Impersonation Banner
 * Shows when admin is viewing as another user
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/hooks/useImpersonation';
import { AlertTriangle, Eye, EyeOff, User } from 'lucide-react';

export const ImpersonationBanner: React.FC = () => {
  const { isImpersonating, impersonatedUser, endImpersonation, loading } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <Alert
      variant="destructive"
      className="fixed top-0 left-0 right-0 z-[100] rounded-none border-l-0 border-r-0 border-t-0"
    >
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span className="flex items-center">
          <Eye className="h-4 w-4 mr-2" />
          Impersonation Mode Active
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={endImpersonation}
          disabled={loading}
          className="bg-white text-destructive hover:bg-destructive hover:text-white"
        >
          <EyeOff className="h-3 w-3 mr-2" />
          {loading ? 'Ending...' : 'Exit Impersonation'}
        </Button>
      </AlertTitle>
      <AlertDescription className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <User className="h-3 w-3" />
          <span>
            Viewing as: <strong>{impersonatedUser.first_name} {impersonatedUser.last_name}</strong>
          </span>
        </div>
        <div className="text-xs">
          ({impersonatedUser.email})
        </div>
        <div className="text-xs text-muted-foreground">
          All actions are logged for security
        </div>
      </AlertDescription>
    </Alert>
  );
};
