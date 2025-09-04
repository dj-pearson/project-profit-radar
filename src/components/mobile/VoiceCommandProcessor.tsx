import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Mic,
  MicOff,
  Play,
  Square,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Calendar,
  MessageSquare,
  Zap,
} from "lucide-react";

export interface VoiceCommand {
  intent:
    | "update_progress"
    | "report_issue"
    | "request_materials"
    | "log_time"
    | "schedule_inspection";
  entities: Record<string, any>;
  confidence: number;
  action_taken: boolean;
  raw_text: string;
  processed_at: Date;
}

interface VoiceRecording {
  id: string;
  blob: Blob;
  duration: number;
  timestamp: Date;
}

interface ProcessedCommand {
  id: string;
  command: VoiceCommand;
  status: "processing" | "completed" | "failed";
  result?: any;
  error?: string;
}

export const VoiceCommandProcessor: React.FC = () => {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [processedCommands, setProcessedCommands] = useState<
    ProcessedCommand[]
  >([]);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");

  const recordingStartTime = useRef<Date | null>(null);

  useEffect(() => {
    loadProjects();
    setupMediaRecorder();
  }, [userProfile?.company_id]);

  const loadProjects = async () => {
    if (!userProfile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("company_id", userProfile.company_id)
        .eq("status", "active")
        .order("name");

      if (error) throw error;
      setProjects(data || []);

      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const setupMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const recorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };

      recorder.onstop = () => {
        if (audioChunks.length > 0) {
          const audioBlob = new Blob(audioChunks, {
            type: "audio/webm;codecs=opus",
          });
          const duration = recordingStartTime.current
            ? Date.now() - recordingStartTime.current.getTime()
            : 0;

          const recording: VoiceRecording = {
            id: crypto.randomUUID(),
            blob: audioBlob,
            duration: duration,
            timestamp: new Date(),
          };

          setRecordings((prev) => [...prev, recording]);
          setAudioChunks([]);

          // Auto-process the recording
          processVoiceCommand(recording);
        }
      };

      setMediaRecorder(recorder);
    } catch (error) {
      console.error("Error setting up media recorder:", error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const startRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "inactive") {
      recordingStartTime.current = new Date();
      mediaRecorder.start();
      setIsRecording(true);
      setAudioChunks([]);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processVoiceCommand = async (recording: VoiceRecording) => {
    if (!selectedProject) {
      toast({
        title: "No Project Selected",
        description: "Please select a project before using voice commands.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const commandId = crypto.randomUUID();
    const processingCommand: ProcessedCommand = {
      id: commandId,
      command: {
        intent: "update_progress",
        entities: {},
        confidence: 0,
        action_taken: false,
        raw_text: "",
        processed_at: new Date(),
      },
      status: "processing",
    };

    setProcessedCommands((prev) => [...prev, processingCommand]);

    try {
      // Convert audio to base64
      const audioBase64 = await blobToBase64(recording.blob);

      // Call Supabase edge function for voice processing
      const { data, error } = await supabase.functions.invoke(
        "process-voice-command",
        {
          body: {
            audio_data: audioBase64,
            project_id: selectedProject,
            user_id: userProfile?.id,
            company_id: userProfile?.company_id,
          },
        }
      );

      if (error) throw error;

      const voiceCommand: VoiceCommand = {
        intent: data.intent || "update_progress",
        entities: data.entities || {},
        confidence: data.confidence || 0.5,
        action_taken: data.action_taken || false,
        raw_text: data.transcript || "",
        processed_at: new Date(),
      };

      // Execute the command
      const result = await executeVoiceCommand(voiceCommand);

      // Update the processed command
      setProcessedCommands((prev) =>
        prev.map((cmd) =>
          cmd.id === commandId
            ? { ...cmd, command: voiceCommand, status: "completed", result }
            : cmd
        )
      );

      toast({
        title: "Voice Command Processed",
        description: `Action: ${getCommandDescription(voiceCommand)}`,
      });
    } catch (error) {
      console.error("Error processing voice command:", error);

      setProcessedCommands((prev) =>
        prev.map((cmd) =>
          cmd.id === commandId
            ? {
                ...cmd,
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error",
              }
            : cmd
        )
      );

      toast({
        title: "Processing Failed",
        description: "Could not process voice command. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeVoiceCommand = async (command: VoiceCommand): Promise<any> => {
    switch (command.intent) {
      case "update_progress":
        return await executeProgressUpdate(command);
      case "report_issue":
        return await executeIssueReport(command);
      case "request_materials":
        return await executeMaterialRequest(command);
      case "log_time":
        return await executeTimeLog(command);
      case "schedule_inspection":
        return await executeInspectionSchedule(command);
      default:
        throw new Error(`Unknown command intent: ${command.intent}`);
    }
  };

  const executeProgressUpdate = async (command: VoiceCommand) => {
    const { task_name, completion_percentage, phase } = command.entities;

    if (!task_name && !phase) {
      throw new Error("Task name or phase required for progress update");
    }

    // Find matching task
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", selectedProject)
      .or(
        `name.ilike.%${task_name || phase}%,phase.ilike.%${task_name || phase}%`
      )
      .limit(1);

    if (error) throw error;
    if (!tasks || tasks.length === 0) {
      throw new Error(`No task found matching "${task_name || phase}"`);
    }

    const task = tasks[0];
    const progress = completion_percentage || 100;

    // Update task progress
    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        progress_percentage: progress,
        status: progress >= 100 ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    if (updateError) throw updateError;

    return { task_id: task.id, task_name: task.name, progress };
  };

  const executeIssueReport = async (command: VoiceCommand) => {
    const { issue_description, location, severity } = command.entities;

    if (!issue_description) {
      throw new Error("Issue description required");
    }

    // Create safety incident or issue report
    const { data, error } = await supabase
      .from("safety_incidents")
      .insert({
        project_id: selectedProject,
        company_id: userProfile?.company_id,
        incident_type: "issue_report",
        description: issue_description,
        location: location || "Voice reported",
        severity: severity || "medium",
        reported_by: userProfile?.id,
        status: "open",
        voice_reported: true,
      })
      .select()
      .single();

    if (error) throw error;

    return { incident_id: data.id, description: issue_description };
  };

  const executeMaterialRequest = async (command: VoiceCommand) => {
    const { material_name, quantity, delivery_date } = command.entities;

    if (!material_name) {
      throw new Error("Material name required");
    }

    // Create material request
    const { data, error } = await supabase
      .from("material_requests")
      .insert({
        project_id: selectedProject,
        company_id: userProfile?.company_id,
        material_name,
        quantity_requested: quantity || 1,
        requested_delivery_date: delivery_date,
        requested_by: userProfile?.id,
        status: "pending",
        voice_requested: true,
        notes: `Voice request: "${command.raw_text}"`,
      })
      .select()
      .single();

    if (error) throw error;

    return { request_id: data.id, material: material_name, quantity };
  };

  const executeTimeLog = async (command: VoiceCommand) => {
    const { hours, activity, date } = command.entities;

    if (!hours) {
      throw new Error("Hours required for time logging");
    }

    const workDate = date ? new Date(date) : new Date();

    // Create time entry
    const { data, error } = await supabase
      .from("time_entries")
      .insert({
        project_id: selectedProject,
        company_id: userProfile?.company_id,
        user_id: userProfile?.id,
        work_date: workDate.toISOString().split("T")[0],
        hours_worked: parseFloat(hours),
        activity_description: activity || "General work",
        voice_logged: true,
        notes: `Voice entry: "${command.raw_text}"`,
      })
      .select()
      .single();

    if (error) throw error;

    return { entry_id: data.id, hours, activity };
  };

  const executeInspectionSchedule = async (command: VoiceCommand) => {
    const { inspection_type, date, time } = command.entities;

    if (!inspection_type) {
      throw new Error("Inspection type required");
    }

    const scheduledDate = date ? new Date(date) : new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1); // Default to tomorrow

    // Create inspection schedule
    const { data, error } = await supabase
      .from("inspection_schedule")
      .insert({
        project_id: selectedProject,
        inspection_type,
        scheduled_date: scheduledDate.toISOString().split("T")[0],
        scheduled_time: time || "09:00",
        status: "pending",
        voice_scheduled: true,
        notes: `Voice scheduled: "${command.raw_text}"`,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      inspection_id: data.id,
      type: inspection_type,
      date: scheduledDate,
    };
  };

  const getCommandDescription = (command: VoiceCommand): string => {
    switch (command.intent) {
      case "update_progress":
        return `Updated progress: ${command.entities.task_name || "task"} to ${
          command.entities.completion_percentage || 100
        }%`;
      case "report_issue":
        return `Reported issue: ${command.entities.issue_description}`;
      case "request_materials":
        return `Requested materials: ${command.entities.quantity || 1} ${
          command.entities.material_name
        }`;
      case "log_time":
        return `Logged time: ${command.entities.hours} hours for ${
          command.entities.activity || "work"
        }`;
      case "schedule_inspection":
        return `Scheduled inspection: ${command.entities.inspection_type}`;
      default:
        return command.raw_text;
    }
  };

  const getCommandIcon = (intent: string) => {
    switch (intent) {
      case "update_progress":
        return <CheckCircle className="h-4 w-4" />;
      case "report_issue":
        return <AlertTriangle className="h-4 w-4" />;
      case "request_materials":
        return <Package className="h-4 w-4" />;
      case "log_time":
        return <Clock className="h-4 w-4" />;
      case "schedule_inspection":
        return <Calendar className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result.split(",")[1]); // Remove data:audio/webm;base64, prefix
        } else {
          reject(new Error("Failed to convert blob to base64"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Voice Commands</h2>
          <p className="text-muted-foreground">
            Use voice commands to update progress, report issues, and manage
            tasks
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-2">
          <Zap className="h-3 w-3" />
          AI Powered
        </Badge>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Voice Recording</CardTitle>
            <CardDescription>
              Hold to record voice commands for hands-free project management
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="mb-4">
              <label
                htmlFor="project-select"
                className="block text-sm font-medium mb-2"
              >
                Active Project
              </label>
              <select
                id="project-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <Button
                size="lg"
                variant={isRecording ? "destructive" : "default"}
                className={`w-32 h-32 rounded-full ${
                  isRecording ? "animate-pulse" : ""
                }`}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={!selectedProject || isProcessing}
              >
                {isRecording ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {isRecording ? (
                <p className="text-red-600 font-medium">
                  Recording... Release to process
                </p>
              ) : isProcessing ? (
                <p className="text-blue-600 font-medium">
                  Processing command...
                </p>
              ) : (
                <p>Hold button and speak your command</p>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Sample Commands:</h4>
              <div className="grid gap-1 text-sm text-muted-foreground">
                <p>• "Mark framing 80% complete"</p>
                <p>• "Report safety issue in area 3"</p>
                <p>• "Order 50 sheets of drywall for tomorrow"</p>
                <p>• "Log 8 hours on electrical rough-in"</p>
                <p>• "Schedule plumbing inspection for Friday"</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Commands</CardTitle>
            <CardDescription>
              History of processed voice commands and their results
            </CardDescription>
          </CardHeader>
          <CardContent>
            {processedCommands.length > 0 ? (
              <div className="space-y-3">
                {processedCommands
                  .slice(-5)
                  .reverse()
                  .map((cmd) => (
                    <div
                      key={cmd.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getCommandIcon(cmd.command.intent)}
                        <div>
                          <p className="font-medium">
                            {getCommandDescription(cmd.command)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            "{cmd.command.raw_text}"
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            cmd.status === "completed"
                              ? "default"
                              : cmd.status === "processing"
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {cmd.status}
                        </Badge>
                        {cmd.command.confidence && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(cmd.command.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Commands Yet</h3>
                <p className="text-muted-foreground">
                  Start using voice commands to see them appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VoiceCommandProcessor;
