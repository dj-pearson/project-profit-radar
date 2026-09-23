import { XCircle } from "lucide-react";

/**
 * Inline error under an /auth field (US-268). The input points at it with
 * aria-describedby and sets aria-invalid; role="alert" announces it.
 */
export function AuthFieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-400 flex items-center gap-1" role="alert">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

