import { MobileConfirm, type MobileConfirmProps } from './MobileConfirm';

type MobileAlertProps = Omit<
  MobileConfirmProps,
  'cancelLabel' | 'onConfirm' | 'destructive'
> & {
  /** Optional: override the dismiss button label. Defaults to 'OK'. */
  dismissLabel?: string;
};

/**
 * Single-action modal alert. Built on MobileConfirm with the cancel
 * button suppressed — use for purely informational dialogs.
 */
export function MobileAlert({
  isOpen,
  onClose,
  title,
  description,
  icon,
  dismissLabel = 'OK',
}: MobileAlertProps) {
  return (
    <MobileConfirm
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      icon={icon}
      confirmLabel={dismissLabel}
      // Render cancel as a hidden-width spacer: we hide it via cancelLabel=''
      // and the only visible CTA becomes the primary button.
      cancelLabel=""
      onConfirm={onClose}
    />
  );
}
