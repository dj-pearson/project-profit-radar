import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import type { LDAPConfig } from './schemas';

interface LdapConfigTabProps {
  ldapForm: UseFormReturn<LDAPConfig>;
  handleLDAPSubmit: (data: LDAPConfig) => Promise<void>;
  isSubmitting: boolean;
  existingConnection: unknown;
  roleOptions: { value: string; label: string }[];
  onCancel: (() => void) | undefined;
}

/** LDAP tab of the SSO connection form. The form state lives in SSOConfigurationForm. */
export function LdapConfigTab({ ldapForm, handleLDAPSubmit, isSubmitting, existingConnection, roleOptions, onCancel }: LdapConfigTabProps) {
  return (
    <Form {...ldapForm}>
      <form onSubmit={ldapForm.handleSubmit(handleLDAPSubmit)} className="space-y-4">
        <FormField
          control={ldapForm.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Active Directory" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={ldapForm.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input placeholder="ldap.company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="use_ssl"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 h-[70px]">
                <FormLabel>Use SSL/TLS</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={ldapForm.control}
            name="bind_dn"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bind DN</FormLabel>
                <FormControl>
                  <Input placeholder="cn=admin,dc=company,dc=com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="bind_password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bind Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={existingConnection ? '••••••••' : 'password'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={ldapForm.control}
            name="user_search_base"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Search Base</FormLabel>
                <FormControl>
                  <Input placeholder="ou=users,dc=company,dc=com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="user_search_filter"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Search Filter</FormLabel>
                <FormControl>
                  <Input placeholder="(uid={username})" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={ldapForm.control}
            name="email_attribute"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Attribute</FormLabel>
                <FormControl>
                  <Input placeholder="mail" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="name_attribute"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name Attribute</FormLabel>
                <FormControl>
                  <Input placeholder="cn" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={ldapForm.control}
            name="allowed_domains"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Allowed Domains</FormLabel>
                <FormControl>
                  <Input placeholder="company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="default_role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Default Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={ldapForm.control}
            name="is_enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel>Enable Connection</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={ldapForm.control}
            name="is_default"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel>Default Connection</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-between pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {existingConnection ? 'Update' : 'Create'} LDAP Connection
          </Button>
        </div>
      </form>
    </Form>
  );
}
