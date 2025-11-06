import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneIncoming, PhoneOutgoing, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface CallHistoryProps {
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  dealId?: string;
  companyId: string;
  limit?: number;
}

export const CallHistory = ({
  leadId,
  contactId,
  opportunityId,
  dealId,
  companyId,
  limit = 10,
}: CallHistoryProps) => {
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["call-logs", { leadId, contactId, opportunityId, dealId, companyId }],
    queryFn: async () => {
      let query = supabase
        .from("call_logs")
        .select("*")
        .eq("company_id", companyId)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (leadId) query = query.eq("lead_id", leadId);
      if (contactId) query = query.eq("contact_id", contactId);
      if (opportunityId) query = query.eq("opportunity_id", opportunityId);
      if (dealId) query = query.eq("deal_id", dealId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "in-progress":
      case "ringing":
        return "secondary";
      case "busy":
      case "no-answer":
        return "outline";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const playRecording = async (recordingSid: string) => {
    try {
      const { data } = await supabase.functions.invoke("twilio-calling", {
        body: {
          action: "get_recording",
          recordingSid,
        },
      });

      if (data?.url) {
        setPlayingRecording(recordingSid);
        const audio = new Audio(data.url);
        audio.play();
        audio.onended = () => setPlayingRecording(null);
      }
    } catch (error) {
      console.error("Error playing recording:", error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!calls || calls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Call History</CardTitle>
          <CardDescription>No calls recorded yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call History
        </CardTitle>
        <CardDescription>{calls.length} calls recorded</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {calls.map((call) => (
            <div
              key={call.id}
              className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {call.direction === "outbound" ? (
                    <PhoneOutgoing className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{call.callee_phone}</span>
                  <Badge variant={getStatusColor(call.status) as any}>
                    {call.status}
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground">
                  {call.started_at
                    ? format(new Date(call.started_at), "MMM d, yyyy 'at' h:mm a")
                    : "No start time"}
                </div>

                {call.duration_seconds > 0 && (
                  <div className="text-sm">
                    Duration: {formatDuration(call.duration_seconds)}
                  </div>
                )}

                {call.notes && (
                  <div className="text-sm text-muted-foreground mt-2">
                    {call.notes}
                  </div>
                )}

                {call.sentiment_label && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      Sentiment: {call.sentiment_label}
                    </Badge>
                  </div>
                )}
              </div>

              {call.recording_sid && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playRecording(call.recording_sid!)}
                  disabled={playingRecording === call.recording_sid}
                >
                  <PlayCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
