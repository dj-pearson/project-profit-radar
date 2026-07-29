import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      "unused-imports": unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      // US-212/US-258/US-264: auto-removable unused imports are an error
      // (eslint --fix strips them). Unused vars are a warning — surfaced but not
      // blocking, since removing them can change behavior and needs review.
      // Args and rest-siblings are ignored (intentional signature shape / omit).
      "unused-imports/no-unused-imports": "error",
      // US-284: forbid silent empty catch blocks. A catch that intentionally
      // ignores an error must carry an explanatory comment (which makes the
      // block non-empty); user-affecting failures must surface a toast and/or
      // Sentry capture. `allowEmptyCatch` stays false so `catch {}` is an error.
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "none",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      // US-258: the ~933-`any` backlog is tracked as a warning (not a blocking
      // error) during the strict-mode burndown, so `eslint .` and the
      // pre-commit hook fail only on real errors, not the known backlog.
      // Ratchet back to "error" once the burndown (US-212) is complete.
      "@typescript-eslint/no-explicit-any": "warn",
      // Base rule for non-app code (tools/, scripts/, mobile-app/, etc.):
      // console is discouraged but only a warning. The app source (src/**) is
      // held to "error" in the dedicated block below.
      "no-console": [
        "warn",
        {
          "allow": ["error"]
        }
      ],
      // US-284: no silent/empty blocks. A catch that genuinely wants to ignore
      // an error must carry an explanatory comment (comment-only blocks are
      // allowed by no-empty), otherwise surface it via toast + Sentry capture.
      "no-empty": ["error", { "allowEmptyCatch": false }],
      // Accessibility rules (WCAG 2.1 AA compliance)
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/lang": "error",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/mouse-events-have-key-events": "warn",
      "jsx-a11y/no-access-key": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-interactive-element-to-noninteractive-role": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-to-interactive-role": "warn",
      "jsx-a11y/no-noninteractive-tabindex": "warn",
      "jsx-a11y/no-redundant-roles": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      "jsx-a11y/scope": "error",
      "jsx-a11y/tabindex-no-positive": "warn",
    },
  },
  {
    // App source must route logging through the logger (src/lib/logger.ts).
    // console.error is retained as a low-level escape hatch: blanket-forwarding
    // the ~1.3k existing console.error calls to logger.error would flood Sentry,
    // so intentional error logging stays on console.error for now (US-209).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-console": [
        "error",
        {
          "allow": ["error"]
        }
      ],
    },
  },
  {
    // Sanctioned logging boundaries — all other code routes through these.
    // logger.ts is the base logger; secureLogger.ts masks PII before logging.
    files: ["src/lib/logger.ts", "src/lib/secureLogger.ts"],
    rules: {
      "no-console": "off",
    },
  }
);
