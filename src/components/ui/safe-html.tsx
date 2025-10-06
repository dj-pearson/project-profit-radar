import { useMemo } from 'react';
import { sanitizeHtml } from '@/lib/security/sanitize';
import { cn } from '@/lib/utils';

interface SafeHtmlProps {
  content: string;
  className?: string;
  allowedTags?: string[];
  allowedAttributes?: string[];
}

/**
 * Component that safely renders HTML content after sanitization
 */
export const SafeHtml = ({
  content,
  className,
  allowedTags,
  allowedAttributes,
}: SafeHtmlProps) => {
  const sanitized = useMemo(
    () => sanitizeHtml(content, { allowedTags, allowedAttributes }),
    [content, allowedTags, allowedAttributes]
  );

  return (
    <div
      className={cn('prose prose-sm max-w-none', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
