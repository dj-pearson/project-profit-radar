/**
 * Mobile-first components export index
 * Import all mobile-optimized components from a single location
 */

// Layout Components
export { MobileLayout, MobileContainer, MobileSection, MobileGrid, MobileStack } from './MobileLayout';

// Card Components
export { MobileCard, MobileCardItem, MobileStatCard, MobileExpandableCard } from './MobileCard';

// Table Components
export { MobileTable, MobileList, MobileScrollTable } from './MobileTable';

// Button Components
export { MobileButton, MobileFAB, MobileButtonGroup, MobileIconButton } from './MobileButton';

// Action Sheets & Drawers
export { MobileActionSheet, MobileActionSheetItem, MobileActionMenu } from './MobileActionSheet';
export { MobileDrawer, MobileFilterDrawer } from './MobileDrawer';

// Form Components
export {
  MobileInput,
  MobileEmailInput,
  MobilePhoneInput,
  MobileNumberInput,
  MobileTextarea,
  MobileFormWrapper
} from './MobileForm';

// Navigation
export { MobileBottomNav, MobileBottomNavWrapper } from './MobileBottomNav';
export { EnhancedMobileBottomNav, EnhancedMobileBottomNavWrapper } from './EnhancedMobileBottomNav';

// Gesture Demos
export {
  LongPressDemo,
  DoubleTapDemo,
  PinchZoomDemo,
  DragDemo,
  RotationDemo,
  CombinedGesturesDemo
} from './GestureDemos';

// Existing mobile components
export { MobileDashboard } from './MobileDashboard';
export { MobileFieldInterface } from './MobileFieldInterface';
export { default as MobileTimeTracker } from './MobileTimeTracker';
export { default as MobileCamera, default as EnhancedMobileCamera } from './MobileCamera';
export { default as MobileMaterialScanner } from './MobileMaterialScanner';
export { MobileMaterialTracker } from './MobileMaterialTracker';
export { default as MobileEquipmentManager } from './MobileEquipmentManager';
export { default as MobileSafetyIncidentManager } from './MobileSafetyIncidentManager';
export { default as VoiceNotes } from './VoiceNotes';
export { OfflineDataManager } from './OfflineDataManager';
