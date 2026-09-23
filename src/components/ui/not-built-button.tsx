import { Button, type ButtonProps } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * US-371: a control for a feature that isn't built.
 *
 * Renders a disabled button with a tooltip saying so, instead of an alert(),
 * a "coming soon" toast or an onClick that does nothing. A disabled button
 * swallows pointer events, so the tooltip hangs off a span around it; the
 * button's title carries the same text for assistive tech.
 */
export interface NotBuiltButtonProps extends Omit<ButtonProps, 'onClick' | 'disabled'> {
  /** What isn't built, e.g. "Chart settings". Shown as "<feature> is not built yet." */
  feature: string;
}

export function NotBuiltButton({ feature, children, ...props }: NotBuiltButtonProps) {
  const label = `${feature} is not built yet.`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button {...props} disabled aria-disabled="true" title={label}>
              {children}
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
