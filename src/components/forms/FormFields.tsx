/**
 * Labelled react-hook-form fields built on the shadcn Form parts (US-268).
 *
 * Each one is a FormField + FormItem + FormLabel + FormControl + FormMessage,
 * so the control gets id, aria-invalid and aria-describedby from FormControl
 * and the Zod error renders under it. They exist so a 25-field form reads as
 * 25 lines rather than 300; anything unusual still uses FormField directly.
 */
import type { ReactNode } from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input, type InputProps } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface BaseProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  className?: string;
}

type InputFieldProps<T extends FieldValues> = BaseProps<T> &
  Omit<InputProps, 'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'className'>;

export function InputFormField<T extends FieldValues>({ control, name, label, className, ...inputProps }: InputFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input {...inputProps} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface TextareaFieldProps<T extends FieldValues> extends BaseProps<T> {
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function TextareaFormField<T extends FieldValues>({ control, name, label, className, ...rest }: TextareaFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea {...rest} {...field} value={field.value ?? ''} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export interface FieldOption {
  value: string;
  label: ReactNode;
}

interface SelectFieldProps<T extends FieldValues> extends BaseProps<T> {
  options: FieldOption[];
  placeholder?: string;
  disabled?: boolean;
  /** Called after the form value changes, for fields that fill others in. */
  onValueChange?: (value: string) => void;
}

export function SelectFormField<T extends FieldValues>({
  control,
  name,
  label,
  className,
  options,
  placeholder,
  disabled,
  onValueChange,
}: SelectFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <Select
            value={field.value ?? ''}
            onValueChange={(v) => {
              field.onChange(v);
              onValueChange?.(v);
            }}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger onBlur={field.onBlur}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function CheckboxFormField<T extends FieldValues>({ control, name, label, className }: BaseProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className ?? 'flex items-center space-x-2 space-y-0'}>
          <FormControl>
            <Checkbox checked={!!field.value} onCheckedChange={(c) => field.onChange(c === true)} />
          </FormControl>
          <FormLabel className="font-normal">{label}</FormLabel>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
