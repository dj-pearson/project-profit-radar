/**
 * Usability Improvements Module
 *
 * Comprehensive usability enhancements for BuildDesk platform.
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

// Enhanced Error Handling
export {
  EnhancedErrorState,
  type ErrorCategory,
  type RecoverySuggestion,
} from "../common/EnhancedErrorState";

// Search Highlighting
export {
  SearchHighlight,
  SearchResultPreview,
  useSearchHighlight,
} from "../search/SearchHighlight";

// Progress Indicators
export {
  ProgressIndicator,
  MultiStepProgress,
  useProgress,
  type ProgressStatus,
} from "../common/ProgressIndicator";

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
