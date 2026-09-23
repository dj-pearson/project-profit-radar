/**
 * A jsdom stand-in for @/components/ui/select (Radix Select needs pointer
 * capture and layout that jsdom lacks). Use it as
 *
 *   vi.mock('@/components/ui/select', () => import('@/test/selectMock'));
 *
 * The trigger stays a button with every prop it was given, so FormControl's
 * id, aria-invalid and aria-describedby land on it the way they do in the
 * app. Each item is an always-rendered button with role "option"; clicking
 * one calls the Select's onValueChange.
 */
import { createContext, forwardRef, useContext, type ReactNode } from 'react';

type Ctx = { value?: string; onValueChange?: (v: string) => void };
const SelectCtx = createContext<Ctx>({});

export const Select = ({
  value,
  onValueChange,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  children?: ReactNode;
  disabled?: boolean;
}) => <SelectCtx.Provider value={{ value, onValueChange }}>{children}</SelectCtx.Provider>;

export const SelectTrigger = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }, ref) => {
    const { value } = useContext(SelectCtx);
    return (
      <button
        type="button"
        role="combobox"
        aria-expanded={false}
        aria-controls="select-mock-listbox"
        data-value={value ?? ''}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  },
);
SelectTrigger.displayName = 'SelectTrigger';

export const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  const { value } = useContext(SelectCtx);
  return <span>{value || placeholder}</span>;
};

export const SelectContent = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

export const SelectItem = ({ value, children }: { value: string; children?: ReactNode; disabled?: boolean }) => {
  const { value: current, onValueChange } = useContext(SelectCtx);
  return (
    <button type="button" role="option" aria-selected={current === value} onClick={() => onValueChange?.(value)}>
      {children}
    </button>
  );
};

export const SelectGroup = ({ children }: { children?: ReactNode }) => <>{children}</>;
export const SelectLabel = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
export const SelectSeparator = () => null;
export const SelectScrollUpButton = () => null;
export const SelectScrollDownButton = () => null;
