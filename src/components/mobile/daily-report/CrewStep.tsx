import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, X, Plus } from 'lucide-react';
import React from 'react';
import type { CrewMember, DailyReportData } from './types';

interface CrewStepProps {
  newCrewMember: CrewMember;
  setNewCrewMember: React.Dispatch<React.SetStateAction<CrewMember>>;
  addCrewMember: () => void;
  removeCrewMember: (index: number) => void;
  reportData: DailyReportData;
}

/** Step 2 of the mobile daily report: crew members and their hours. */
export function CrewStep({ newCrewMember, setNewCrewMember, addCrewMember, removeCrewMember, reportData }: CrewStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Crew Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 p-4 border rounded-lg bg-muted/50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input
                value={newCrewMember.name}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Crew member name"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Input
                value={newCrewMember.role}
                onChange={(e) => setNewCrewMember(prev => ({ ...prev, role: e.target.value }))}
                placeholder="Position/trade"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Regular Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={newCrewMember.hours_worked}
                onChange={(e) => setNewCrewMember(prev => ({ 
                  ...prev, 
                  hours_worked: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
            <div>
              <Label>Overtime Hours</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={newCrewMember.overtime_hours}
                onChange={(e) => setNewCrewMember(prev => ({ 
                  ...prev, 
                  overtime_hours: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          </div>
          <Button
            onClick={addCrewMember}
            disabled={!newCrewMember.name || !newCrewMember.role}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Crew Member
          </Button>
        </div>

        {reportData.crew_members.map((member, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-background border rounded">
            <div className="flex-1">
              <div className="font-medium">{member.name}</div>
              <div className="text-sm text-muted-foreground">
                {member.role} • {member.hours_worked + member.overtime_hours}h total
                {member.overtime_hours > 0 && ` (${member.overtime_hours}h OT)`}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCrewMember(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {reportData.crew_members.length > 0 && (
          <div className="text-center p-2 bg-muted rounded">
            <strong>Total Crew Hours: {reportData.total_crew_hours}h</strong>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
