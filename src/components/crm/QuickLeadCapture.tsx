/**
 * Quick Lead Capture
 * Streamlined form for capturing leads quickly on mobile or desktop
 * Auto-saves to minimize data loss
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  UserPlus,
  Building,
  Phone,
  Mail,
  DollarSign,
  Tag,
  Save,
  Loader2,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface QuickLeadCaptureProps {
  onLeadCreated?: (lead: any) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const QuickLeadCapture: React.FC<QuickLeadCaptureProps> = ({
  onLeadCreated,
  onCancel,
  compact = false
}) => {
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);

  // Form fields
  const [companyName, setCompanyName] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');

  // Auto-save draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      if (companyName || contactName || contactEmail) {
        const draft = {
          companyName,
          contactName,
          contactEmail,
          contactPhone,
          estimatedValue,
          source,
          priority,
          notes
        };
        localStorage.setItem('leadDraft', JSON.stringify(draft));
        setAutoSaved(true);
        setTimeout(() => setAutoSaved(false), 2000);
      }
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => clearTimeout(timer);
  }, [companyName, contactName, contactEmail, contactPhone, estimatedValue, source, priority, notes]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('leadDraft');
    if (draft) {
      const parsed = JSON.parse(draft);
      setCompanyName(parsed.companyName || '');
      setContactName(parsed.contactName || '');
      setContactEmail(parsed.contactEmail || '');
      setContactPhone(parsed.contactPhone || '');
      setEstimatedValue(parsed.estimatedValue || '');
      setSource(parsed.source || '');
      setPriority(parsed.priority || 'medium');
      setNotes(parsed.notes || '');

      toast({
        title: 'Draft Restored',
        description: 'Your previous lead draft has been restored',
      });
    }
  }, []);

  const validateForm = () => {
    if (!companyName) {
      toast({
        title: 'Company Name Required',
        description: 'Please enter a company name',
        variant: 'destructive'
      });
      return false;
    }

    if (!contactName) {
      toast({
        title: 'Contact Name Required',
        description: 'Please enter a contact name',
        variant: 'destructive'
      });
      return false;
    }

    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const saveLead = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          company_id: userProfile?.company_id,
          company_name: companyName,
          contact_name: contactName,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          source: source || 'manual',
          priority: priority,
          notes: notes || null,
          stage: 'new',
          created_by: user?.id,
          last_contact: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Clear draft
      localStorage.removeItem('leadDraft');

      toast({
        title: '✓ Lead Created',
        description: `${companyName} has been added to your pipeline`,
      });

      onLeadCreated?.(data);

      // Reset form
      resetForm();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save lead',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setContactName('');
    setContactEmail('');
    setContactPhone('');
    setEstimatedValue('');
    setSource('');
    setPriority('medium');
    setNotes('');
  };

  if (compact) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Quick Lead Capture
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Company Name *"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
          />
          <Input
            placeholder="Contact Name *"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input
            placeholder="Phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <Input
            placeholder="Estimated Value ($)"
            type="number"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
          />

          <div className="flex gap-2">
            <Button onClick={saveLead} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save
            </Button>
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-6 w-6" />
                Capture New Lead
              </CardTitle>
              <CardDescription>Add a potential customer to your pipeline</CardDescription>
            </div>
            {autoSaved && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                Auto-saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Building className="h-4 w-4" />
              Company Information
            </h3>

            <div>
              <Label htmlFor="company-name">Company Name *</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="ABC Construction Co."
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </h3>

            <div>
              <Label htmlFor="contact-name">Contact Name *</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact-email">Email</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="john@abcconstruction.com"
                />
              </div>

              <div>
                <Label htmlFor="contact-phone">Phone</Label>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Lead Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated-value">Estimated Value</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="estimated-value"
                    type="number"
                    min="0"
                    step="1000"
                    value={estimatedValue}
                    onChange={(e) => setEstimatedValue(e.target.value)}
                    placeholder="50000"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="source">Lead Source</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="How did you hear about them?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="cold_call">Cold Call</SelectItem>
                  <SelectItem value="trade_show">Trade Show</SelectItem>
                  <SelectItem value="social_media">Social Media</SelectItem>
                  <SelectItem value="advertisement">Advertisement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any relevant notes about this lead..."
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
            )}
            <Button onClick={saveLead} disabled={saving} className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Lead
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuickLeadCapture;
