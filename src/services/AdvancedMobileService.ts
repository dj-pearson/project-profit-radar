import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface VoiceCommand {
  id: string;
  command: string;
  intent: 'create_task' | 'update_status' | 'record_time' | 'add_expense' | 'create_report';
  entities: Record<string, any>;
  confidence: number;
  timestamp: string;
}

export interface PhotoAnalysis {
  id: string;
  imageUrl: string;
  analysis: {
    defects: Array<{
      type: string;
      confidence: number;
      location: { x: number; y: number; width: number; height: number };
      severity: 'low' | 'medium' | 'high';
    }>;
    progress: {
      completionPercentage: number;
      workCompleted: string[];
      workRemaining: string[];
    };
    safety: {
      violations: string[];
      riskScore: number;
    };
  };
  projectId: string;
  uploadedBy: string;
  processedAt: string;
}

export interface OfflineAction {
  id: string;
  type: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: string;
  userId: string;
  projectId?: string;
  synced: boolean;
}

export interface GeofenceEvent {
  id: string;
  userId: string;
  projectId: string;
  eventType: 'enter' | 'exit';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  timestamp: string;
  autoClockIn?: boolean;
}

class AdvancedMobileService {
  private offlineActions: OfflineAction[] = [];
  private syncInProgress = false;

  /**
   * Process voice commands using natural language processing
   */
  async processVoiceCommand(audioBlob: Blob, projectId: string): Promise<VoiceCommand> {
    try {
      // Convert audio to text using Web Speech API or external service
      const transcript = await this.speechToText(audioBlob);
      
      // Parse intent and entities from transcript
      const parsedCommand = this.parseVoiceCommand(transcript);
      
      const voiceCommand: VoiceCommand = {
        id: crypto.randomUUID(),
        command: transcript,
        intent: parsedCommand.intent,
        entities: parsedCommand.entities,
        confidence: parsedCommand.confidence,
        timestamp: new Date().toISOString()
      };

      // Execute the command
      await this.executeVoiceCommand(voiceCommand, projectId);

      // Log the command for learning
      await supabase
        .from('voice_commands_log')
        .insert([{
          project_id: projectId,
          command_text: transcript,
          intent: parsedCommand.intent,
          entities: parsedCommand.entities,
          confidence: parsedCommand.confidence,
          executed_successfully: true
        }]);

      return voiceCommand;

    } catch (error: any) {
      console.error('Error processing voice command:', error);
      throw new Error(`Voice command failed: ${error.message}`);
    }
  }

  /**
   * Analyze construction photos for defects, progress, and safety
   */
  async analyzeConstructionPhoto(imageFile: File, projectId: string): Promise<PhotoAnalysis> {
    try {
      // Upload image to storage
      const fileName = `${projectId}/photos/${Date.now()}-${imageFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(fileName, imageFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('project-photos')
        .getPublicUrl(fileName);

      // Analyze image using AI/ML service (placeholder for actual implementation)
      const analysis = await this.performImageAnalysis(urlData.publicUrl);

      const photoAnalysis: PhotoAnalysis = {
        id: crypto.randomUUID(),
        imageUrl: urlData.publicUrl,
        analysis,
        projectId,
        uploadedBy: 'current-user', // Get from auth context
        processedAt: new Date().toISOString()
      };

      // Store analysis results
      await supabase
        .from('photo_analysis')
        .insert([{
          project_id: projectId,
          image_url: urlData.publicUrl,
          analysis_data: analysis,
          uploaded_by: photoAnalysis.uploadedBy
        }]);

      // Create quality inspection record if defects found
      if (analysis.defects.length > 0) {
        await this.createQualityInspectionFromPhoto(photoAnalysis);
      }

      // Update project progress if progress detected
      if (analysis.progress.completionPercentage > 0) {
        await this.updateProjectProgressFromPhoto(projectId, analysis.progress);
      }

      return photoAnalysis;

    } catch (error: any) {
      console.error('Error analyzing construction photo:', error);
      throw new Error(`Photo analysis failed: ${error.message}`);
    }
  }

  /**
   * Handle offline data synchronization
   */
  async syncOfflineData(): Promise<{ synced: number; failed: number }> {
    if (this.syncInProgress) return { synced: 0, failed: 0 };

    try {
      this.syncInProgress = true;
      let synced = 0;
      let failed = 0;

      // Get offline actions from local storage
      const offlineActions = this.getOfflineActions();

      for (const action of offlineActions) {
        try {
          await this.syncSingleAction(action);
          this.markActionAsSynced(action.id);
          synced++;
        } catch (error) {
          console.error('Failed to sync action:', action, error);
          failed++;
        }
      }

      // Clean up synced actions
      this.cleanupSyncedActions();

      toast({
        title: "Sync Complete",
        description: `${synced} actions synced, ${failed} failed`,
      });

      return { synced, failed };

    } catch (error: any) {
      console.error('Error during offline sync:', error);
      return { synced: 0, failed: 0 };
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Handle geofence events for automatic time tracking
   */
  async handleGeofenceEvent(event: GeofenceEvent): Promise<void> {
    try {
      // Log the geofence event
      await supabase
        .from('geofence_events')
        .insert([{
          user_id: event.userId,
          project_id: event.projectId,
          event_type: event.eventType,
          latitude: event.location.latitude,
          longitude: event.location.longitude,
          accuracy: event.location.accuracy,
          timestamp: event.timestamp,
          auto_clock_in: event.autoClockIn
        }]);

      // Auto clock in/out if enabled
      if (event.autoClockIn) {
        if (event.eventType === 'enter') {
          await this.autoClockIn(event.userId, event.projectId, event.timestamp);
        } else if (event.eventType === 'exit') {
          await this.autoClockOut(event.userId, event.projectId, event.timestamp);
        }
      }

      // Send notification
      toast({
        title: event.eventType === 'enter' ? "Entered Project Site" : "Left Project Site",
        description: event.autoClockIn ? 
          `Automatically ${event.eventType === 'enter' ? 'clocked in' : 'clocked out'}` :
          "Geofence event recorded",
      });

    } catch (error: any) {
      console.error('Error handling geofence event:', error);
    }
  }

  /**
   * Create augmented reality markup for construction photos
   */
  async createARMarkup(imageUrl: string, markups: Array<{
    type: 'defect' | 'measurement' | 'note';
    position: { x: number; y: number };
    data: any;
  }>): Promise<string> {
    try {
      // Create AR markup overlay
      const markupData = {
        imageUrl,
        markups,
        createdAt: new Date().toISOString()
      };

      // Store markup data
      const { data, error } = await supabase
        .from('ar_markups')
        .insert([markupData])
        .select()
        .single();

      if (error) throw error;

      return data.id;

    } catch (error: any) {
      console.error('Error creating AR markup:', error);
      throw new Error(`AR markup creation failed: ${error.message}`);
    }
  }

  // Private helper methods
  private async speechToText(audioBlob: Blob): Promise<string> {
    // Implement speech-to-text conversion
    // This could use Web Speech API or external service like Google Speech-to-Text
    return new Promise((resolve, reject) => {
      const recognition = new (window as any).webkitSpeechRecognition() || new (window as any).SpeechRecognition();
      
      if (!recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.start();
    });
  }

  private parseVoiceCommand(transcript: string): {
    intent: VoiceCommand['intent'];
    entities: Record<string, any>;
    confidence: number;
  } {
    const lowerTranscript = transcript.toLowerCase();
    
    // Simple intent detection (could be enhanced with NLP library)
    if (lowerTranscript.includes('create task') || lowerTranscript.includes('add task')) {
      return {
        intent: 'create_task',
        entities: this.extractTaskEntities(transcript),
        confidence: 0.8
      };
    }
    
    if (lowerTranscript.includes('update status') || lowerTranscript.includes('mark as')) {
      return {
        intent: 'update_status',
        entities: this.extractStatusEntities(transcript),
        confidence: 0.75
      };
    }
    
    if (lowerTranscript.includes('record time') || lowerTranscript.includes('log hours')) {
      return {
        intent: 'record_time',
        entities: this.extractTimeEntities(transcript),
        confidence: 0.85
      };
    }
    
    if (lowerTranscript.includes('add expense') || lowerTranscript.includes('record expense')) {
      return {
        intent: 'add_expense',
        entities: this.extractExpenseEntities(transcript),
        confidence: 0.8
      };
    }
    
    // Default fallback
    return {
      intent: 'create_task',
      entities: { description: transcript },
      confidence: 0.5
    };
  }

  private extractTaskEntities(transcript: string): Record<string, any> {
    // Extract task-related entities from transcript
    const entities: Record<string, any> = {};
    
    // Simple regex patterns (could be enhanced with NLP)
    const taskMatch = transcript.match(/create task (.+?)(?:\s+due|$)/i);
    if (taskMatch) {
      entities.description = taskMatch[1].trim();
    }
    
    const dueDateMatch = transcript.match(/due (.+)/i);
    if (dueDateMatch) {
      entities.dueDate = this.parseDateFromText(dueDateMatch[1]);
    }
    
    return entities;
  }

  private extractStatusEntities(transcript: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    const statusMatch = transcript.match(/mark as (.+)/i) || transcript.match(/update status to (.+)/i);
    if (statusMatch) {
      entities.status = statusMatch[1].trim();
    }
    
    return entities;
  }

  private extractTimeEntities(transcript: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    const hoursMatch = transcript.match(/(\d+(?:\.\d+)?)\s*hours?/i);
    if (hoursMatch) {
      entities.hours = parseFloat(hoursMatch[1]);
    }
    
    return entities;
  }

  private extractExpenseEntities(transcript: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    const amountMatch = transcript.match(/\$?(\d+(?:\.\d{2})?)/);
    if (amountMatch) {
      entities.amount = parseFloat(amountMatch[1]);
    }
    
    const categoryMatch = transcript.match(/for (.+?)(?:\s+\$|$)/i);
    if (categoryMatch) {
      entities.description = categoryMatch[1].trim();
    }
    
    return entities;
  }

  private parseDateFromText(dateText: string): string {
    // Simple date parsing (could be enhanced with date parsing library)
    const today = new Date();
    
    if (dateText.toLowerCase().includes('today')) {
      return today.toISOString().split('T')[0];
    }
    
    if (dateText.toLowerCase().includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Try to parse as date
    const parsed = new Date(dateText);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    
    return today.toISOString().split('T')[0];
  }

  private async executeVoiceCommand(command: VoiceCommand, projectId: string): Promise<void> {
    switch (command.intent) {
      case 'create_task':
        await this.createTaskFromVoice(command.entities, projectId);
        break;
      case 'update_status':
        await this.updateStatusFromVoice(command.entities, projectId);
        break;
      case 'record_time':
        await this.recordTimeFromVoice(command.entities, projectId);
        break;
      case 'add_expense':
        await this.addExpenseFromVoice(command.entities, projectId);
        break;
      default:
        throw new Error(`Unknown intent: ${command.intent}`);
    }
  }

  private async createTaskFromVoice(entities: Record<string, any>, projectId: string): Promise<void> {
    const taskData = {
      project_id: projectId,
      name: entities.description || 'Voice-created task',
      due_date: entities.dueDate,
      status: 'pending',
      created_via: 'voice_command'
    };

    const { error } = await supabase
      .from('tasks')
      .insert([taskData]);

    if (error) throw error;

    toast({
      title: "Task Created",
      description: `"${taskData.name}" has been added to the project`,
    });
  }

  private async updateStatusFromVoice(entities: Record<string, any>, projectId: string): Promise<void> {
    // This would need task identification logic
    toast({
      title: "Status Update",
      description: "Status update functionality would be implemented here",
    });
  }

  private async recordTimeFromVoice(entities: Record<string, any>, projectId: string): Promise<void> {
    if (!entities.hours) return;

    const timeData = {
      project_id: projectId,
      hours: entities.hours,
      date: new Date().toISOString().split('T')[0],
      description: 'Voice-recorded time entry'
    };

    const { error } = await supabase
      .from('time_entries')
      .insert([timeData]);

    if (error) throw error;

    toast({
      title: "Time Recorded",
      description: `${entities.hours} hours logged for today`,
    });
  }

  private async addExpenseFromVoice(entities: Record<string, any>, projectId: string): Promise<void> {
    if (!entities.amount) return;

    const expenseData = {
      project_id: projectId,
      amount: entities.amount,
      description: entities.description || 'Voice-recorded expense',
      expense_date: new Date().toISOString().split('T')[0]
    };

    const { error } = await supabase
      .from('expenses')
      .insert([expenseData]);

    if (error) throw error;

    toast({
      title: "Expense Added",
      description: `$${entities.amount} expense recorded`,
    });
  }

  private async performImageAnalysis(imageUrl: string): Promise<PhotoAnalysis['analysis']> {
    // Placeholder for actual AI/ML image analysis
    // This would integrate with services like Google Vision API, AWS Rekognition, etc.
    
    return {
      defects: [
        {
          type: 'crack',
          confidence: 0.85,
          location: { x: 100, y: 150, width: 50, height: 20 },
          severity: 'medium'
        }
      ],
      progress: {
        completionPercentage: 75,
        workCompleted: ['Foundation', 'Framing'],
        workRemaining: ['Electrical', 'Plumbing', 'Drywall']
      },
      safety: {
        violations: ['Missing hard hat in photo'],
        riskScore: 25
      }
    };
  }

  private async createQualityInspectionFromPhoto(photoAnalysis: PhotoAnalysis): Promise<void> {
    const inspectionData = {
      project_id: photoAnalysis.projectId,
      inspection_type: 'photo_analysis',
      score: 100 - (photoAnalysis.analysis.defects.length * 10),
      issues_found: photoAnalysis.analysis.defects.length,
      notes: `Automated inspection from photo analysis. Defects detected: ${photoAnalysis.analysis.defects.map(d => d.type).join(', ')}`,
      inspector_id: photoAnalysis.uploadedBy,
      photo_url: photoAnalysis.imageUrl
    };

    await supabase
      .from('quality_inspections')
      .insert([inspectionData]);
  }

  private async updateProjectProgressFromPhoto(projectId: string, progress: PhotoAnalysis['analysis']['progress']): Promise<void> {
    // Update project completion percentage if the photo analysis shows higher completion
    const { data: project } = await supabase
      .from('projects')
      .select('completion_percentage')
      .eq('id', projectId)
      .single();

    if (project && progress.completionPercentage > (project.completion_percentage || 0)) {
      await supabase
        .from('projects')
        .update({ 
          completion_percentage: progress.completionPercentage,
          last_updated_via: 'photo_analysis'
        })
        .eq('id', projectId);
    }
  }

  private getOfflineActions(): OfflineAction[] {
    const stored = localStorage.getItem('offline_actions');
    return stored ? JSON.parse(stored) : [];
  }

  private async syncSingleAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'create':
        await supabase.from(action.table).insert([action.data]);
        break;
      case 'update':
        await supabase.from(action.table).update(action.data).eq('id', action.data.id);
        break;
      case 'delete':
        await supabase.from(action.table).delete().eq('id', action.data.id);
        break;
    }
  }

  private markActionAsSynced(actionId: string): void {
    const actions = this.getOfflineActions();
    const updatedActions = actions.map(action => 
      action.id === actionId ? { ...action, synced: true } : action
    );
    localStorage.setItem('offline_actions', JSON.stringify(updatedActions));
  }

  private cleanupSyncedActions(): void {
    const actions = this.getOfflineActions();
    const unsyncedActions = actions.filter(action => !action.synced);
    localStorage.setItem('offline_actions', JSON.stringify(unsyncedActions));
  }

  private async autoClockIn(userId: string, projectId: string, timestamp: string): Promise<void> {
    const timeEntry = {
      user_id: userId,
      project_id: projectId,
      start_time: timestamp,
      date: timestamp.split('T')[0],
      auto_generated: true,
      source: 'geofence'
    };

    await supabase
      .from('time_entries')
      .insert([timeEntry]);
  }

  private async autoClockOut(userId: string, projectId: string, timestamp: string): Promise<void> {
    // Find the most recent unclosed time entry for this user/project
    const { data: openEntry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .is('end_time', null)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (openEntry) {
      const startTime = new Date(openEntry.start_time);
      const endTime = new Date(timestamp);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      await supabase
        .from('time_entries')
        .update({
          end_time: timestamp,
          hours: Math.round(hours * 100) / 100 // Round to 2 decimal places
        })
        .eq('id', openEntry.id);
    }
  }
}

// Export singleton instance
export const advancedMobileService = new AdvancedMobileService();
export default advancedMobileService;
