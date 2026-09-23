import { useEffect } from 'react';
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';

/**
 * The /auth forms validate through react-hook-form, but the Auth page still
 * owns the values: sign-in and sign-up share the typed email, the OTP steps
 * read it after the form is gone, and "Back" clears the reset email. Fields
 * write through to the page's setters as the user types; this pulls a value
 * the page changed on its own back into the form.
 */
export function useSyncedFormValues<T extends FieldValues>(
  form: UseFormReturn<T>,
  values: Partial<T>,
): void {
  const keys = Object.keys(values) as Path<T>[];
  const deps = keys.map((k) => values[k as keyof T]);
  useEffect(() => {
    for (const key of keys) {
      const next = values[key as keyof T] as PathValue<T, Path<T>>;
      if (form.getValues(key) !== next) form.setValue(key, next);
    }
    // Re-run only when one of the page's values changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, ...deps]);
}

/** Joins the ids an input is described by, dropping the ones not rendered. */
export function describedBy(...ids: Array<string | false | undefined>): string | undefined {
  const present = ids.filter(Boolean);
  return present.length ? present.join(' ') : undefined;
}
