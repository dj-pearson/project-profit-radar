import * as React from "react";
import { cn } from "@/lib/utils";

interface SearchHighlightProps {
  /**
   * The full text to display
   */
  text: string;

  /**
   * The search query to highlight
   */
  query: string;

  /**
   * Case sensitive matching
   * Default: false
   */
  caseSensitive?: boolean;

  /**
   * CSS class for highlighted portions
   */
  highlightClassName?: string;

  /**
   * CSS class for the container
   */
  className?: string;

  /**
   * HTML element to use as container
   * Default: span
   */
  as?: React.ElementType;
}

/**
 * SearchHighlight - Highlight search query matches in text
 *
 * Visually emphasizes search matches to help users quickly identify
 * why a result was returned.
 *
 * @example
 * ```tsx
 * <SearchHighlight
 *   text="BuildDesk Construction Management"
 *   query="desk"
 *   highlightClassName="bg-yellow-200 font-bold"
 * />
 * // Renders: Build<mark>Desk</mark> Construction Management
 * ```
 */
export function SearchHighlight({
  text,
  query,
  caseSensitive = false,
  highlightClassName = "bg-yellow-200 dark:bg-yellow-900 font-semibold px-0.5 rounded",
  className,
  as = "span",
}: SearchHighlightProps) {
  const Component = as as any;
  
  // If no query, return plain text
  if (!query || query.trim() === "") {
    return <Component className={className}>{text}</Component>;
  }

  // Split text by matches
  const parts = splitTextByQuery(text, query, caseSensitive);

  return (
    <Component className={className}>
      {parts.map((part, index) => {
        if (part.isMatch) {
          return (
            <mark
              key={index}
              className={cn(highlightClassName, "bg-transparent")}
              style={{ backgroundColor: "inherit" }}
            >
              <span className={highlightClassName}>{part.text}</span>
            </mark>
          );
        }
        return <React.Fragment key={index}>{part.text}</React.Fragment>;
      })}
    </Component>
  );
}

/**
 * Split text into matched and unmatched parts
 */
function splitTextByQuery(
  text: string,
  query: string,
  caseSensitive: boolean
): Array<{ text: string; isMatch: boolean }> {
  if (!query.trim()) {
    return [{ text, isMatch: false }];
  }

  // Escape special regex characters
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Create regex with global and case-insensitive flags
  const flags = caseSensitive ? "g" : "gi";
  const regex = new RegExp(escapedQuery, flags);

  const parts: Array<{ text: string; isMatch: boolean }> = [];
  let lastIndex = 0;

  // Find all matches
  let match;
  while ((match = regex.exec(text)) !== null) {
    // Add unmatched text before this match
    if (match.index > lastIndex) {
      parts.push({
        text: text.substring(lastIndex, match.index),
        isMatch: false,
      });
    }

    // Add matched text
    parts.push({
      text: match[0],
      isMatch: true,
    });

    lastIndex = regex.lastIndex;

    // Prevent infinite loop on zero-length matches
    if (match.index === regex.lastIndex) {
      regex.lastIndex++;
    }
  }

  // Add remaining unmatched text
  if (lastIndex < text.length) {
    parts.push({
      text: text.substring(lastIndex),
      isMatch: false,
    });
  }

  return parts;
}

/**
 * useSearchHighlight - Hook for programmatic highlighting
 *
 * Useful when you need to highlight multiple items or integrate
 * with complex rendering logic.
 */
export function useSearchHighlight(query: string, caseSensitive = false) {
  const highlight = React.useCallback(
    (text: string) => {
      return splitTextByQuery(text, query, caseSensitive);
    },
    [query, caseSensitive]
  );

  const hasMatches = React.useCallback(
    (text: string) => {
      if (!query.trim()) return false;

      const flags = caseSensitive ? "" : "i";
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, flags);

      return regex.test(text);
    },
    [query, caseSensitive]
  );

  const matchCount = React.useCallback(
    (text: string) => {
      if (!query.trim()) return 0;

      const flags = caseSensitive ? "g" : "gi";
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedQuery, flags);

      const matches = text.match(regex);
      return matches ? matches.length : 0;
    },
    [query, caseSensitive]
  );

  return {
    highlight,
    hasMatches,
    matchCount,
  };
}

/**
 * SearchResultPreview - Preview text with highlighted matches
 *
 * Shows a snippet of text around the first match, useful for search results.
 */
interface SearchResultPreviewProps {
  /**
   * Full text to search in
   */
  text: string;

  /**
   * Search query
   */
  query: string;

  /**
   * Maximum length of preview (characters)
   * Default: 200
   */
  maxLength?: number;

  /**
   * Context characters to show around match
   * Default: 50
   */
  contextLength?: number;

  /**
   * Show ellipsis when truncated
   * Default: true
   */
  showEllipsis?: boolean;

  /**
   * CSS classes
   */
  className?: string;
  highlightClassName?: string;
}

export function SearchResultPreview({
  text,
  query,
  maxLength = 200,
  contextLength = 50,
  showEllipsis = true,
  className,
  highlightClassName,
}: SearchResultPreviewProps) {
  // Find first match position
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escapedQuery, "i");
  const match = text.match(regex);

  let preview = text;
  let hasLeadingEllipsis = false;
  let hasTrailingEllipsis = false;

  if (match && match.index !== undefined) {
    // Calculate preview window around match
    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    let start = Math.max(0, matchStart - contextLength);
    let end = Math.min(text.length, matchEnd + contextLength);

    // Adjust to word boundaries if possible
    if (start > 0) {
      const spaceIndex = text.indexOf(" ", start);
      if (spaceIndex !== -1 && spaceIndex < matchStart) {
        start = spaceIndex + 1;
      }
      hasLeadingEllipsis = true;
    }

    if (end < text.length) {
      const spaceIndex = text.lastIndexOf(" ", end);
      if (spaceIndex !== -1 && spaceIndex > matchEnd) {
        end = spaceIndex;
      }
      hasTrailingEllipsis = true;
    }

    preview = text.substring(start, end);
  } else if (text.length > maxLength) {
    // No match, just truncate
    preview = text.substring(0, maxLength);
    hasTrailingEllipsis = true;
  }

  return (
    <span className={cn("text-sm text-muted-foreground", className)}>
      {showEllipsis && hasLeadingEllipsis && "... "}
      <SearchHighlight
        text={preview}
        query={query}
        highlightClassName={highlightClassName}
      />
      {showEllipsis && hasTrailingEllipsis && " ..."}
    </span>
  );
}
