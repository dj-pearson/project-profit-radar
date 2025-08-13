import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { EnhancedMobileCamera } from '@/components/mobile/EnhancedMobileCamera';
import SignatureCapture from '@/components/common/SignatureCapture';
import VoiceNotes from '@/components/mobile/VoiceNotes';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle } from 'lucide-react';

interface InspectionConductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspection: any | null;
  teamMembers: any[];
  onSaved: () => void;
}

interface ChecklistItem {
  id: string;
  text: string;
  status: 'pass' | 'fail' | 'na';
  photo_required?: boolean;
  notes?: string;
  photos?: any[];
  assignee_id?: string;
  due_date?: string;
}

const templates: Record<string, ChecklistItem[]> = {
  pre_construction: [
    { id: 'pc-1', text: 'Permits and approvals verified', status: 'na' },
    { id: 'pc-2', text: 'Site access and logistics confirmed', status: 'na' },
    { id: 'pc-3', text: 'Safety plan reviewed with crew', status: 'na', photo_required: false }
  ],
  framing: [
    { id: 'fr-1', text: 'Framing is plumb and square', status: 'na', photo_required: true },
    { id: 'fr-2', text: 'Headers and beams installed per plans', status: 'na' },
    { id: 'fr-3', text: 'Sheathing fasteners spaced correctly', status: 'na' }
  ],
  mep: [
    { id: 'mep-1', text: 'Electrical rough-in meets code', status: 'na', photo_required: true },
    { id: 'mep-2', text: 'Plumbing pressure test completed', status: 'na' },
    { id: 'mep-3', text: 'HVAC ducting sealed', status: 'na' }
  ],
  final: [
    { id: 'fn-1', text: 'Paint and finishes free of defects', status: 'na' },
    { id: 'fn-2', text: 'Fixtures installed and operational', status: 'na' },
    { id: 'fn-3', text: 'Client walkthrough completed', status: 'na' }
  ]
};

const addHours = (hours: number) => new Date(Date.now() + hours * 3600 * 1000).toISOString();

const InspectionConductDialog: React.FC<InspectionConductDialogProps> = ({ open, onOpenChange, inspection, teamMembers, onSaved }) => {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [deficiencies, setDeficiencies] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showCameraForItem, setShowCameraForItem] = useState<string | null>(null);
  const [clientSignature, setClientSignature] = useState<string | null>(null);
  const [clientRating, setClientRating] = useState<number>(5);

  useEffect(() => {
    if (inspection) {
      setItems((inspection.checklist_items as ChecklistItem[]) || []);
      setDeficiencies(inspection.deficiencies || []);
      setPhotos(inspection.photos || []);
    }
  }, [inspection]);

  const onTemplateSelect = (value: string) => {
    setSelectedTemplate(value);
    setItems(templates[value] ? JSON.parse(JSON.stringify(templates[value])) : []);
  };

  const updateItem = (id: string, updates: Partial<ChecklistItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleAddDeficiency = (item: ChecklistItem) => {
    const def = {
      id: `${inspection.id}-${item.id}-${Date.now()}`,
      inspection_id: inspection.id,
      project_id: inspection.project_id,
      text: item.text,
      status: 'open',
      created_at: new Date().toISOString(),
      due_date: item.due_date || addHours(48),
      assignee_id: item.assignee_id || null,
      photos: item.photos || [],
      notes: item.notes || ''
    };
    setDeficiencies(prev => [...prev, def]);
    toast({ title: 'Deficiency added', description: '48h remediation window started.' });
  };

  const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePhotoCapture = async (file: File, metadata?: any) => {
    if (!inspection || !showCameraForItem) return;

    // Try upload to storage, fallback to data URL
    let url: string | null = null;
    try {
      const path = `inspections/${inspection.id}/photos/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('project-documents').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('project-documents').getPublicUrl(path);
      url = data.publicUrl;
    } catch (e) {
      url = await fileToDataUrl(file);
    }

    const photoEntry = { id: `${Date.now()}`, url, metadata, item_id: showCameraForItem };
    setPhotos(prev => [...prev, photoEntry]);
    setItems(prev => prev.map(i => i.id === showCameraForItem ? { ...i, photos: [...(i.photos||[]), photoEntry] } : i));
    setShowCameraForItem(null);
  };

  const save = async () => {
    if (!inspection) return;

    const updatedPhotos = [...photos];
    if (clientSignature) {
      updatedPhotos.push({ id: `sig-${Date.now()}`, url: clientSignature, type: 'signature', rating: clientRating, signed_at: new Date().toISOString() });
    }

    const { error } = await supabase
      .from('quality_inspections')
      .update({ checklist_items: items, deficiencies, photos: updatedPhotos })
      .eq('id', inspection.id);

    if (error) {
      toast({ title: 'Save failed', description: 'Could not save inspection.', variant: 'destructive' });
      return;
    }

    toast({ title: 'Inspection saved', description: 'Updates have been saved.' });
    onSaved();
    onOpenChange(false);
  };

  if (!inspection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conduct Inspection • {inspection.inspection_number}</DialogTitle>
          <DialogDescription>Mark checklist items, capture evidence, and collect client sign-off.</DialogDescription>
        </DialogHeader>

        {/* Template loader (only when empty) */}
        {(!items || items.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={onTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose inspection template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pre_construction">Pre-Construction</SelectItem>
                  <SelectItem value="framing">Framing</SelectItem>
                  <SelectItem value="mep">MEP</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Checklist */}
        {items && items.length > 0 && (
          <div className="space-y-3">
            <Label>Checklist Items</Label>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="w-[28%]">
                      <div className="flex items-center gap-2">
                        {item.photo_required && <Badge variant="secondary">Photo req.</Badge>}
                        <span>{item.text}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[16%]">
                      <RadioGroup value={item.status} onValueChange={(v) => updateItem(item.id, { status: v as any })} className="flex gap-3">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="pass" id={`pass-${item.id}`} />
                          <Label htmlFor={`pass-${item.id}`}>Pass</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="fail" id={`fail-${item.id}`} />
                          <Label htmlFor={`fail-${item.id}`}>Fail</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="na" id={`na-${item.id}`} />
                          <Label htmlFor={`na-${item.id}`}>N/A</Label>
                        </div>
                      </RadioGroup>
                    </TableCell>
                    <TableCell className="w-[16%]">
                      <Select value={item.assignee_id || ''} onValueChange={(v) => updateItem(item.id, { assignee_id: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          {teamMembers.map(tm => (
                            <SelectItem key={tm.id} value={tm.id}>
                              {tm.first_name} {tm.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="w-[14%]">
                      <Input type="date" value={(item.due_date||'').slice(0,10)} onChange={(e) => updateItem(item.id, { due_date: e.target.value })} />
                    </TableCell>
                    <TableCell className="w-[18%]">
                      <Textarea rows={2} value={item.notes || ''} onChange={(e) => updateItem(item.id, { notes: e.target.value })} />
                    </TableCell>
                    <TableCell className="w-[8%]">
                      <Button size="sm" variant="outline" onClick={() => setShowCameraForItem(item.id)}>
                        <Camera className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell className="w-[8%]">
                      {item.status === 'fail' && (
                        <Button size="sm" variant="destructive" onClick={() => handleAddDeficiency(item)}>
                          <XCircle className="h-4 w-4 mr-1" /> Create
                        </Button>
                      )}
                      {item.status === 'pass' && (
                        <Badge variant="default" className="ml-2"><CheckCircle className="h-3 w-3 mr-1" /> OK</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Client sign-off */}
        <div className="space-y-2">
          <Label>Client Sign-off (optional)</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <SignatureCapture onChange={setClientSignature} />
            </div>
            <div className="space-y-2">
              <Label>Rating (1-5)</Label>
              <Input type="number" min={1} max={5} value={clientRating} onChange={(e) => setClientRating(parseInt(e.target.value||'5', 10))} />
            </div>
          </div>
        </div>

        {/* Voice Notes */}
        <div>
          <Label>Voice Notes (optional)</Label>
          <VoiceNotes projectId={inspection.project_id} />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </div>

        {showCameraForItem && (
          <EnhancedMobileCamera onCapture={handlePhotoCapture} onCancel={() => setShowCameraForItem(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InspectionConductDialog;
