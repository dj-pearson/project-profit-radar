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

/**
 * Quick Start Guide
 *
 * ## Inline Help Tooltips
 * ```tsx
 * import { HelpTooltip, FormFieldHelp } from '@/components/usability';
 *
 * <FormLabel>
 *   Job Cost Code
 *   <FormFieldHelp content="Cost codes organize expenses by category" />
 * </FormLabel>
 * ```
 *
 * ## Keyboard Shortcuts Panel
 * ```tsx
 * import { KeyboardShortcutsPanel } from '@/components/usability';
 * import { useGlobalShortcuts } from '@/hooks/useKeyboardShortcuts';
 *
 * function App() {
 *   const shortcuts = useGlobalShortcuts();
 *
 *   return (
 *     <>
 *       <KeyboardShortcutsPanel shortcuts={shortcuts} />
 *       {/* rest of app */}
 *     </>
 *   );
 * }
 * ```
 *
 * ## Command Palette
 * ```tsx
 * import { CommandPalette } from '@/components/usability';
 *
 * function App() {
 *   return (
 *     <>
 *       <CommandPalette />
 *       {/* rest of app */}
 *     </>
 *   );
 * }
 * ```
 *
 * ## Real-time Form Validation
 * ```tsx
 * import { useRealtimeValidation } from '@/components/usability';
 * import { z } from 'zod';
 *
 * const emailSchema = z.string().email();
 *
 * function EmailField() {
 *   const [email, setEmail] = useState('');
 *   const validation = useRealtimeValidation({
 *     schema: emailSchema,
 *     value: email,
 *   });
 *
 *   return (
 *     <div>
 *       <Input
 *         value={email}
 *         onChange={(e) => setEmail(e.target.value)}
 *         onBlur={validation.markAsTouched}
 *       />
 *       {validation.errors.map(err => (
 *         <p className="text-red-500">{err}</p>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Enhanced Error Messages
 * ```tsx
 * import { EnhancedErrorState } from '@/components/usability';
 *
 * function DataLoader() {
 *   if (error) {
 *     return (
 *       <EnhancedErrorState
 *         error={error}
 *         category="network"
 *         onRetry={refetch}
 *       />
 *     );
 *   }
 * }
 * ```
 *
 * ## Search Result Highlighting
 * ```tsx
 * import { SearchHighlight } from '@/components/usability';
 *
 * function SearchResult({ item, query }) {
 *   return (
 *     <div>
 *       <SearchHighlight text={item.title} query={query} />
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Progress Indicators
 * ```tsx
 * import { ProgressIndicator, useProgress } from '@/components/usability';
 *
 * function FileUpload() {
 *   const progress = useProgress();
 *
 *   const uploadFile = async () => {
 *     progress.start();
 *
 *     // Simulate upload
 *     for (let i = 0; i <= 100; i += 10) {
 *       progress.update(i);
 *       await new Promise(r => setTimeout(r, 200));
 *     }
 *
 *     progress.complete();
 *   };
 *
 *   return (
 *     <div>
 *       <Button onClick={uploadFile}>Upload</Button>
 *       <ProgressIndicator
 *         progress={progress.progress}
 *         status={progress.status}
 *         showElapsedTime
 *         startTime={progress.startTime}
 *       />
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Touch Optimization
 * ```tsx
 * import { getTouchButtonClasses, touchFormClasses } from '@/components/usability';
 *
 * function MobileForm() {
 *   return (
 *     <form className={touchFormClasses.fieldSpacing}>
 *       <Input className={touchFormClasses.input} />
 *       <Button className={getTouchButtonClasses('lg')}>
 *         Submit
 *       </Button>
 *     </form>
 *   );
 * }
 * ```
 */
