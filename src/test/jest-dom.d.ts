// Registers @testing-library/jest-dom's matcher types on Vitest's `expect`
// (US-212). The matchers are extended at runtime in src/test/setup.ts via
// `expect.extend(...)`, but jest-dom v6 ships its TypeScript augmentation under
// the dedicated `/vitest` entrypoint, which must be imported for tsc to know
// about `toBeInTheDocument`, `toHaveClass`, `toHaveAttribute`, etc. Without this
// every jest-dom assertion in a *.test.tsx file is a TS2339 "property does not
// exist on type Assertion" error (~260 of them). This is a type-only file with
// no runtime effect.
import '@testing-library/jest-dom/vitest';
