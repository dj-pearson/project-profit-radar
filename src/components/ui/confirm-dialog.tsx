import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Shared confirmation for destructive or irreversible actions (US-374).
 *
 * Two ways to use it:
 *
 * 1. Imperative, from any handler (replaces window.confirm):
 *      const confirmFn = useConfirm();
 *      if (!(await confirmFn({ title: "Delete estimate?", destructive: true }))) return;
 *    The promise resolves true on confirm, false on cancel/escape/outside click.
 *    Requires <ConfirmDialogHost /> mounted once (App.tsx does this).
 *
 * 2. Controlled component with an async onConfirm, when the page owns the
 *    open state:
 *      <ConfirmDialog open={open} onOpenChange={setOpen} title="..." onConfirm={doDelete} />
 */

export interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  /** Label for the confirm button. Defaults to "Delete" when destructive, else "Confirm". */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. */
  destructive?: boolean;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs when the user confirms. The dialog stays open, with buttons disabled, until it settles. */
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
}: ConfirmDialogProps) {
  const [pending, setPending] = React.useState(false);

  const handleConfirm = async (event: React.MouseEvent) => {
    // Keep the dialog open until onConfirm finishes.
    event.preventDefault();
    setPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={handleConfirm}
            className={cn(destructive && buttonVariants({ variant: "destructive" }))}
          >
            {confirmLabel ?? (destructive ? "Delete" : "Confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Imperative API: a single host renders whichever request is current.

interface PendingRequest {
  options: ConfirmOptions;
  resolve: (value: boolean) => void;
}

type Listener = (request: PendingRequest | null) => void;

let listener: Listener | null = null;
let current: PendingRequest | null = null;

/**
 * Ask the user to confirm. Resolves true on confirm, false otherwise.
 * If no host is mounted it resolves false, so a destructive action never
 * runs unconfirmed.
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!listener) {
      resolve(false);
      return;
    }
    // A newer request supersedes an unanswered one.
    current?.resolve(false);
    current = { options, resolve };
    listener(current);
  });
}

/** Returns the confirm function. Stable across renders. */
export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  return confirmAction;
}

/** Mount once near the app root. */
export function ConfirmDialogHost() {
  const [request, setRequest] = React.useState<PendingRequest | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    listener = (next) => {
      setRequest(next);
      setOpen(next !== null);
    };
    return () => {
      listener = null;
      current?.resolve(false);
      current = null;
    };
  }, []);

  const settle = (value: boolean) => {
    if (request && current === request) {
      current = null;
      request.resolve(value);
    }
    setOpen(false);
  };

  if (!request) return null;

  return (
    <ConfirmDialog
      {...request.options}
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(false);
      }}
      onConfirm={() => settle(true)}
    />
  );
}
