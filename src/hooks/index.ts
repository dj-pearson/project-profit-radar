/**
 * Custom hooks export index
 */

// Media Query Hooks
export {
  useMediaQuery,
  useIsMobile,
  useIsTablet,
  useIsDesktop,
  useIsSmallMobile,
  useBreakpoint
} from './useMediaQuery';

// Touch Device Hooks
export {
  useTouchDevice,
  useOrientation,
  useSafeArea
} from './useTouchDevice';

// Basic Gesture Hooks
export {
  useSwipeGesture,
  useSwipeableItem,
  usePullToRefresh
} from './useSwipeGesture';

// Advanced Gesture Hooks
export {
  useLongPress,
  useDoubleTap,
  usePinchZoom,
  useDragGesture,
  useRotationGesture,
  useMultiTouchGestures
} from './useAdvancedGestures';

// Navigation Hooks
export {
  useMobileNavigation,
  useCustomNavigation,
  type MobileNavItem
} from './useMobileNavigation';
