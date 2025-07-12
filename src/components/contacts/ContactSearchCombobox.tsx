import { useState } from "react";
import { Check, ChevronsUpDown, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  contact_type: string;
}

interface ContactSearchComboboxProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact | null) => void;
  placeholder?: string;
  className?: string;
}

export function ContactSearchCombobox({
  contacts,
  selectedContact,
  onSelectContact,
  placeholder = "Search contacts...",
  className
}: ContactSearchComboboxProps) {
  const [open, setOpen] = useState(false);

  const getContactDisplay = (contact: Contact) => {
    let display = `${contact.first_name} ${contact.last_name}`;
    if (contact.company_name) {
      display += ` - ${contact.company_name}`;
    }
    if (contact.email) {
      display += ` (${contact.email})`;
    }
    return display;
  };

  const getContactSearchText = (contact: Contact) => {
    return `${contact.first_name} ${contact.last_name} ${contact.company_name || ''} ${contact.email || ''} ${contact.phone || ''}`.toLowerCase();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          {selectedContact ? (
            <span className="truncate">
              {getContactDisplay(selectedContact)}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Type to search contacts..." 
            className="h-9"
          />
          <CommandList className="max-h-64">
            <CommandEmpty>No contacts found.</CommandEmpty>
            <CommandGroup>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={getContactSearchText(contact)}
                  onSelect={() => {
                    onSelectContact(selectedContact?.id === contact.id ? null : contact);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-full bg-construction-blue flex items-center justify-center text-white text-xs font-medium shrink-0">
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">
                        {contact.first_name} {contact.last_name}
                        {contact.company_name && (
                          <span className="text-muted-foreground font-normal"> - {contact.company_name}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        {contact.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      selectedContact?.id === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}