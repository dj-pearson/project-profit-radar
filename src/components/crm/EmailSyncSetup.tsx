import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EmailAccount {
  id: string;
  provider: string;
  email_address: string;
  display_name: string | null;
  sync_enabled: boolean;
  last_sync_at: string | null;
  is_primary: boolean;
  created_at: string;
}

export const EmailSyncSetup = ({ companyId }: { companyId: string }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ["email-accounts", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_accounts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EmailAccount[];
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (accountId: string) => {
      // Call sync edge function
      const { data, error } = await supabase.functions.invoke("email-sync", {
        body: { action: "sync", accountId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Sync Started",
        description: "Your emails are being synchronized...",
      });
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from("email_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Account Removed",
        description: "Email account disconnected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["email-accounts"] });
      setDeleteAccountId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const connectGmail = () => {
    toast({
      title: "Gmail Setup Required",
      description: "Please configure Google OAuth first. See EMAIL_SYNC_SETUP_GUIDE.md",
    });
    // In production, this would redirect to OAuth flow
    // window.location.href = `/api/auth/gmail`;
  };

  const connectOutlook = () => {
    toast({
      title: "Outlook Setup Required",
      description: "Please configure Microsoft OAuth first. See EMAIL_SYNC_SETUP_GUIDE.md",
    });
    // In production, this would redirect to OAuth flow
    // window.location.href = `/api/auth/outlook`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Email Sync Accounts</CardTitle>
          <CardDescription>
            Connect your email accounts to sync messages with your CRM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Connect Buttons */}
            <div className="flex gap-2">
              <Button onClick={connectGmail} variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Connect Gmail
              </Button>
              <Button onClick={connectOutlook} variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Connect Outlook
              </Button>
            </div>

            {/* Connected Accounts */}
            {isLoading && (
              <div className="text-sm text-muted-foreground">
                Loading accounts...
              </div>
            )}

            {accounts && accounts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No email accounts connected yet</p>
                <p className="text-sm mt-2">
                  Connect Gmail or Outlook to start syncing emails
                </p>
              </div>
            )}

            {accounts && accounts.length > 0 && (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {account.email_address}
                        </span>
                        {account.is_primary && (
                          <Badge variant="default">Primary</Badge>
                        )}
                        <Badge
                          variant={
                            account.provider === "gmail"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {account.provider}
                        </Badge>
                      </div>

                      {account.display_name && (
                        <div className="text-sm text-muted-foreground">
                          {account.display_name}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {account.sync_enabled ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Sync enabled
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-orange-600">
                            <AlertCircle className="h-3 w-3" />
                            Sync disabled
                          </span>
                        )}

                        {account.last_sync_at && (
                          <span>
                            Last synced:{" "}
                            {format(
                              new Date(account.last_sync_at),
                              "MMM d, h:mm a"
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => syncMutation.mutate(account.id)}
                        disabled={syncMutation.isPending}
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            syncMutation.isPending ? "animate-spin" : ""
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteAccountId(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteAccountId}
        onOpenChange={() => setDeleteAccountId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Email Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your email account and stop syncing messages.
              Existing synced emails will remain in your CRM.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteAccountId && deleteMutation.mutate(deleteAccountId)
              }
              className="bg-destructive text-destructive-foreground"
            >
              Remove Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
