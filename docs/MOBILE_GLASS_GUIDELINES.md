# Brikly Mobile Glass Design Guidelines

When and how to use the iOS-style glass design system shipped in the
mobile UI modernization. Applies to everything rendered at `md:hidden`
breakpoints and to the Capacitor iOS/Android app.

---

## TL;DR Decision Matrix

| Surface type | Use | Notes |
|---|---|---|
| Interactive card (tappable, 1-2 lines) | `glass` | Default for MobileCard, list rows, quick-action tiles |
| Supporting / inline panel | `glass-thin` | Notes, secondary cards, form inputs, toggle rows |
| Modal / sheet / drawer / top-level chrome | `glass-thick` | Bottom sheets, action sheets, modal dialogs, iOS popover bg |
| Sticky top bar / bottom tab bar | `glass-chrome` | Always with specular 1px top highlight line |
| Dense data table / 5+ columns of numbers | `solid` | Use `mobileCardClasses.containerSolid`. Glass hurts scannability at high info density |
| Destructive / warning callout | `glass` + tinted ring | e.g., `rounded-2xl glass border-destructive/30 ring-1 ring-inset ring-destructive/20` |
| Image thumbnail / media tile | `solid` | Glass under an image adds no value |
| Full-screen overlay scrim | `ios-scrim` | 38% slate + 4px blur; auto-deepens in dark mode |

---

## Contrast Rules (WCAG AA)

Glass surfaces drop up to 15% contrast vs solid cards when the page background
is busy. These rules keep text readable.

1. **Body copy**: always use `text-foreground` or `text-muted-foreground` —
   never hardcode a gray. Both tokens are pre-verified against both
   `ios-page-bg` gradients.
2. **Icons on glass**: minimum 4.5:1 against the underlying background.
   For decorative icons (`aria-hidden="true"`), 3:1 is acceptable.
3. **Primary CTAs on glass**: always use `shadow-ios-2` or stronger so
   the button separates visually — don't rely on background contrast alone.
4. **Destructive on glass**: the destructive color token is color-blind safe
   but add an icon (AlertTriangle, Trash) so intent isn't purely color-coded.
5. **Forms**: `MobileTextField` adds `ring-2 ring-primary/60 shadow-ios-2`
   on focus and `ring-2 ring-destructive/70` on error — ring contrast is
   verified against all three ambient backgrounds.

**Contrast failures usually mean the glass layer is too thin.** When in
doubt, upgrade from `glass-thin` to `glass`, or from `glass` to a solid
`bg-card` variant.

---

## When to Use `solid` Instead

Glass is gorgeous but not free. Use the solid variant when any of these are true:

- The surface contains a dense data table (5+ numeric columns).
- Users will scroll through hundreds of rows (virtualized lists).
- The surface already sits on a busy image background.
- The component must be legible over animated content (e.g., map tiles).
- The surface is inside an iframe / embedded widget.

For these cases:

```tsx
// MobileCard with solid surface
<MobileCard surface="solid">...</MobileCard>

// MobileStatCard with solid surface
<MobileStatCard surface="solid" title="..." value="..." />

// Shared utility class
<div className={mobileCardClasses.containerSolid}>...</div>
```

---

## Performance: Automatic Degradation

The `.low-gpu` class on `<html>` (set by `useDevicePerformance`) flattens
every glass surface to a solid card background — `backdrop-filter: none`
and `background: hsl(var(--card) / 0.97)`. This triggers on:

- iOS ≤ 14 (A12 and older).
- `navigator.deviceMemory` ≤ 2 GB.
- `navigator.hardwareConcurrency` ≤ 2.
- User preference: `brikly.a11y.reduceTransparency = 'on'`.

**Do not manually feature-detect backdrop-filter** — let the hook handle
it. The low-gpu path is CSS-only and costs nothing at runtime.

---

## Dark Mode

Every glass utility has paired dark-mode tokens. Semantic-colored
callouts (red, orange, yellow, blue, green) follow this formula:

```
rounded-2xl glass shadow-ios-1
border-<color>-200/60 dark:border-<color>-500/30
bg-<color>-50/80 dark:bg-<color>-950/20
```

This keeps the light-mode pastel while providing a subtle dark-mode tint
that passes WCAG AA against the `.dark` background.

---

## Motion

Glass surfaces should move with iOS spring curves:

```
ease: cubic-bezier(0.32, 0.72, 0, 1)
duration: 150 / 260 / 420ms (fast / default / slow)
```

Available utility classes:

- `ios-press` — tactile scale-95 on press.
- `ios-rise` — fade-up enter (420ms).
- `ios-fade-in` — plain fade (260ms).
- `ios-sheet-in` — slide-up for modal sheets (420ms).
- `ios-scale-in` — pop-in for centered modals (260ms).
- `ios-shimmer` — skeleton loader shimmer.

All animations honor `prefers-reduced-motion`.

---

## Checklist for New Mobile Screens

Before merging a new mobile screen PR, verify:

- [ ] Wrapped in `<MobileLayout ambientBackground>` (default).
- [ ] Sticky header/tab-bar uses `glass-chrome` + `specular 1px top highlight`.
- [ ] All interactive cards use `MobileCard` (defaults to `surface='glass'`).
- [ ] Dense data tables use `surface='solid'`.
- [ ] Buttons use `rounded-xl` (or `rounded-2xl` for FAB), `shadow-ios-2`.
- [ ] Form inputs use `MobileTextField` / `MobileTextArea` / `MobileSelectField`.
- [ ] Destructive actions go through `MobileConfirm` with `destructive={true}`.
- [ ] Toasts use the app's shared `Toaster` (already restyled).
- [ ] Safe-area insets handled on any fixed element (top or bottom).
- [ ] Haptics use semantic methods (`haptics.tap`, `haptics.destructive`),
      not raw `haptics.impact('light')`.
- [ ] `prefers-reduced-motion` path verified.
- [ ] Dark-mode spot-check across at least 3 screens.
- [ ] Lighthouse mobile accessibility score ≥ 95.

---

## Don't

- ❌ Apply `backdrop-filter` manually. Use `glass` / `glass-thin` / `glass-thick`.
- ❌ Hardcode `bg-white/N` + `blur` — always go through utility classes so
     the `low-gpu` fallback kicks in.
- ❌ Stack glass on glass (the blur compounds and you lose contrast).
- ❌ Use `bg-card` + `border` for a clickable card — use `MobileCard`.
- ❌ Ship a sticky bar without the 1px specular highlight line — it's what
     sells the glass.
- ❌ Use `rounded-lg` on mobile surfaces — the system is `rounded-xl` /
     `rounded-2xl` / `rounded-3xl` (dialogs).

---

## Reference implementations

- Dashboard — `src/components/mobile/MobileDashboard.tsx` (glass welcome
  banner, stat tiles, quick actions, dual glass-chrome bars).
- Feature screen — `src/components/mobile/MobileMaterialTracker.tsx`
  (glass-chrome sticky header, glass-thick modal dialogs, glass list rows).
- Forms — `src/components/mobile/forms/` (floating-label text fields,
  segmented controls, toggle rows).
- Bottom sheet — `src/components/mobile/BottomSheet.tsx`.
- Modal dialog — `src/components/mobile/MobileConfirm.tsx`.

---

**Last updated**: 2026-04-18
**Owner**: Mobile / UI system
**Related PRDs**: US-136 (propagation), US-137 (forms), US-140 (alerts),
US-143 (this doc), US-144 (perf guard).
