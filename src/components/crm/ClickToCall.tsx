import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ClickToCallProps {
  phoneNumber: string;
  leadId?: string;
  contactId?: string;
  opportunityId?: string;
  dealId?: string;
  companyId: string;
  contactName?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
}

export const ClickToCall: React.FC<ClickToCallProps> = ({
  phoneNumber,
  leadId,
  contactId,
  opportunityId,
  dealId,
  companyId,
  contactName,
  variant = "outline",
  size = "sm",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const [callStatus, setCallStatus] = useState<string>("initiated");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [notes, setNotes] = useState("");
  const [callLogId, setCallLogId] = useState<string | null>(null);
  const { toast } = useToast();

  // Timer for call duration
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall && callStatus === "in-progress") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInCall, callStatus]);

  // Poll call status
  React.useEffect(() => {
    let statusInterval: NodeJS.Timeout;
    if (callSid && isInCall) {
      statusInterval = setInterval(async () => {
        try {
          const { data, error } = await supabase.functions.invoke(
            "twilio-calling",
            {
              body: {
                action: "get_call_status",
                callSid,
              },
            }
          );

          if (error) throw error;

          if (data?.status?.status) {
            setCallStatus(data.status.status);

            if (
              ["completed", "busy", "failed", "no-answer", "canceled"].includes(
                data.status.status
              )
            ) {
              setIsInCall(false);
              toast({
                title: "Call Ended",
                description: `Call status: ${data.status.status}`,
              });
            }
          }
        } catch (error) {
          console.error("Error polling call status:", error);
        }
      }, 2000);
    }
    return () => clearInterval(statusInterval);
  }, [callSid, isInCall, toast]);

  const initiateCall = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        "twilio-calling",
        {
          body: {
            action: "initiate_call",
            to: phoneNumber,
            leadId,
            contactId,
            opportunityId,
            dealId,
            companyId,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        setCallSid(data.call.sid);
        setCallLogId(data.callLog.id);
        setIsInCall(true);
        setCallStatus(data.call.status);
        setIsOpen(true);
        toast({
          title: "Call Initiated",
          description: `Calling ${contactName || phoneNumber}...`,
        });
      }
    } catch (error: any) {
      console.error("Error initiating call:", error);
      toast({
        title: "Call Failed",
        description: error.message || "Failed to initiate call",
        variant: "destructive",
      });
    }
  };

  const endCall = () => {
    setIsInCall(false);
    setIsOpen(false);

    // Save notes if any
    if (notes && callLogId) {
      supabase
        .from("call_logs")
        .update({ notes })
        .eq("id", callLogId)
        .then(() => {
          toast({
            title: "Call Notes Saved",
            description: "Your call notes have been saved successfully",
          });
        });
    }

    // Reset state
    setCallSid(null);
    setCallStatus("initiated");
    setCallDuration(0);
    setNotes("");
    setCallLogId(null);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, this would send a command to Twilio
    toast({
      title: isMuted ? "Unmuted" : "Muted",
      description: isMuted ? "Microphone is now on" : "Microphone is now off",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "success";
      case "in-progress":
      case "ringing":
        return "default";
      case "busy":
      case "no-answer":
        return "warning";
      case "failed":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={initiateCall}
        disabled={!phoneNumber || isInCall}
      >
        <Phone className="h-4 w-4 mr-1" />
        Call
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isInCall ? "Call in Progress" : "Call Ended"}
            </DialogTitle>
            <DialogDescription>
              {contactName && <div className="font-medium">{contactName}</div>}
              <div className="text-sm">{phoneNumber}</div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Call Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={getStatusColor(callStatus) as any}>
                {callStatus}
              </Badge>
            </div>

            {/* Call Duration */}
            {isInCall && (
              <div className="text-center">
                <div className="text-3xl font-mono font-bold">
                  {formatDuration(callDuration)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Duration
                </div>
              </div>
            )}

            {/* Call Controls */}
            {isInCall && (
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleMute}
                  className="rounded-full w-16 h-16"
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6" />
                  ) : (
                    <Mic className="h-6 w-6" />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={endCall}
                  className="rounded-full w-16 h-16"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </div>
            )}

            {/* Call Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Call Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                disabled={!isInCall && !notes}
              />
            </div>

            {/* Close Button */}
            {!isInCall && (
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
