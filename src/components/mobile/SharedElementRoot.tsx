import { createContext, useContext, useId, type ReactNode } from 'react';

/**
 * Scope provider for SharedElement layout transitions.
 *
 * Split out of SharedElementTransition.tsx (US-388): App.tsx renders the root
 * on every route, and importing it from the same module as SharedElement
 * pulled all of framer-motion (~40 KB gz) into the entry chunk, so the
 * landing page paid for an animation only the Projects pages use. This file
 * must stay free of framer-motion imports.
 */
interface SharedElementContextValue {
  scope: string;
}

const SharedElementContext = createContext<SharedElementContextValue | null>(
  null,
);

/** Returns the current shared-element scope, or null outside a root. */
export function useSharedElementScope(): string | null {
  return useContext(SharedElementContext)?.scope ?? null;
}

/**
 * Provides a scope for shared-element transitions. Render once at the
 * app root (or inside a route wrapper) so layoutIds don't collide
 * between unrelated pages.
 */
export function SharedElementRoot({
  children,
  scope,
}: {
  children: ReactNode;
  /** Optional namespace; defaults to a generated id. */
  scope?: string;
}) {
  const generated = useId();
  return (
    <SharedElementContext.Provider value={{ scope: scope ?? generated }}>
      {children}
    </SharedElementContext.Provider>
  );
}
