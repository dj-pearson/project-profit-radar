/**
 * Pick the customer, don't retype them (US-326).
 *
 * The same homeowner used to exist as four unlinked rows: a CRM contact, free
 * text on the estimate, free text on the project, and an email on their portal
 * access. CreateProject's autocomplete made it worse rather than better - it
 * offered strings selected from past projects, so choosing one COPIED the text
 * again instead of linking a record.
 *
 * This returns a contact id. The name and email travel with it so callers can
 * keep dual-writing the legacy text columns for a release, but the id is the
 * point.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';
import { Check, ChevronsUpDown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PickedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface ContactPickerProps {
  value: string | null;
  onChange: (contact: PickedContact | null) => void;
  label?: string;
  /** Shown under the field, e.g. to explain that the name fields follow. */
  hint?: string;
  disabled?: boolean;
}

interface ContactRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
}

const displayName = (c: ContactRow): string =>
  [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  || c.company_name
  || c.email
  || 'Unnamed contact';

export function ContactPicker({
  value,
  onChange,
  label = 'Customer',
  hint,
  disabled,
}: ContactPickerProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userProfile?.company_id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, phone, company_name')
      .eq('company_id', userProfile.company_id)
      .order('first_name', { ascending: true })
      .limit(500);

    if (error) {
      logger.error('Could not load contacts for the picker', error);
      toast({
        variant: 'destructive',
        title: 'Could not load customers',
        description: error.message,
      });
    }
    setContacts(data || []);
    setLoading(false);
  }, [userProfile?.company_id, toast]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(
    () => contacts.find((c) => c.id === value) || null,
    [contacts, value]
  );

  const pick = (contact: ContactRow) => {
    onChange({
      id: contact.id,
      name: displayName(contact),
      email: contact.email,
      phone: contact.phone,
    });
    setOpen(false);
  };

  const createContact = async () => {
    if (!userProfile?.company_id) return;
    if (!newFirst.trim() && !newEmail.trim()) {
      toast({
        variant: 'destructive',
        title: 'A name or an email is needed',
        description: 'Otherwise this customer cannot be found again.',
      });
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        company_id: userProfile.company_id,
        first_name: newFirst.trim() || newEmail.trim(),
        last_name: newLast.trim() || null,
        email: newEmail.trim() || null,
        phone: newPhone.trim() || null,
        contact_type: 'client',
      })
      .select('id, first_name, last_name, email, phone, company_name')
      .single();

    setSaving(false);

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Could not add the customer',
        description: error?.message || 'Please try again.',
      });
      return;
    }

    setContacts((prev) => [data, ...prev]);
    pick(data);
    setCreating(false);
    setNewFirst(''); setNewLast(''); setNewEmail(''); setNewPhone('');
  };

  return (
    <div>
      <Label htmlFor="contact-picker">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="contact-picker"
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selected ? displayName(selected) : 'Choose a customer...'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search customers..." />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center text-sm">
                  <p className="text-muted-foreground mb-2">
                    {loading ? 'Loading...' : 'No customer with that name.'}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setOpen(false); setCreating(true); }}
                  >
                    <UserPlus className="h-4 w-4 mr-1" aria-hidden="true" />
                    Add a new customer
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={`${displayName(contact)} ${contact.email ?? ''}`}
                    onSelect={() => pick(contact)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        contact.id === value ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="truncate">{displayName(contact)}</div>
                      {contact.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => { setOpen(false); setCreating(true); }}
            >
              <UserPlus className="h-4 w-4 mr-2" aria-hidden="true" />
              Add a new customer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a customer</DialogTitle>
            <DialogDescription>
              They are saved once, and every estimate, project and invoice for them links here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-contact-first">First name</Label>
                <Input id="new-contact-first" value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)} placeholder="Dana" />
              </div>
              <div>
                <Label htmlFor="new-contact-last">Last name</Label>
                <Input id="new-contact-last" value={newLast}
                  onChange={(e) => setNewLast(e.target.value)} placeholder="Whitfield" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="new-contact-email">Email</Label>
                <Input id="new-contact-email" type="email" value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)} placeholder="dana@example.com" />
              </div>
              <div>
                <Label htmlFor="new-contact-phone">Phone</Label>
                <Input id="new-contact-phone" value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)} placeholder="(555) 010-2233" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={createContact} disabled={saving}>
              {saving ? 'Adding...' : 'Add customer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ContactPicker;
