/**
 * Usability Improvements Module
 *
 * Comprehensive usability enhancements for Brikly platform.
 * Makes the platform more accessible, discoverable, and user-friendly
 * for contractors in the field and office staff.
 *
 * @module usability
 */

// Help & Tooltips
export {
  HelpTooltip,
  FormFieldHelp,
  FeatureHelp,
  type HelpTooltipVariant,
} from "../help/HelpTooltip";

// Keyboard Shortcuts
export {
  KeyboardShortcutsPanel,
  useKeyboardShortcutsPanel,
} from "../help/KeyboardShortcutsPanel";

// Command Palette
export { CommandPalette } from "../navigation/CommandPalette";

// Real-time Validation
export {
  useRealtimeValidation,
  useFormValidation,
  type ValidationState,
} from "../../hooks/useRealtimeValidation";

// Touch Optimization
export {
  getTouchButtonClasses,
  getTouchIconButtonClasses,
  getTouchSpacingClasses,
  useIsTouchDevice,
  verifyTouchTarget,
  touchFormClasses,
  touchListClasses,
  triggerHapticFeedback,
  useTouchSwipe,
  workGloveOptimization,
  outdoorModeOptimization,
  MIN_TOUCH_TARGET_SIZE,
  TOUCH_TARGET_SIZES,
  TOUCH_SPACING,
  type SwipeHandlers,
} from "../../lib/touchOptimization";

// For usage examples and documentation, see: docs/usability-guide.md
