import { AnimatePresence, motion } from 'framer-motion';
import { CloudOff, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

interface MobileOfflineIndicatorProps {
  className?: string;
}

/**
 * Slim animated connectivity banner for the mobile app shell.
 *
 * - Offline: amber banner with CloudOff icon
 * - Reconnecting: brief blue "Syncing…" banner with spinner
 *
 * Sits just under the status bar (respects safe-area-top via MobileLayout's
 * parent) and animates in/out with framer-motion.
 */
export function MobileOfflineIndicator({ className }: MobileOfflineIndicatorProps) {
  const { isOnline, justReconnected } = useConnectionStatus();

  const showOffline = !isOnline;
  const showSyncing = isOnline && justReconnected;
  const visible = showOffline || showSyncing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={showOffline ? 'offline' : 'syncing'}
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          role="status"
          aria-live="polite"
          className={cn(
            'md:hidden',
            'sticky top-0 left-0 right-0 z-40',
            'flex items-center justify-center gap-2',
            'px-4 py-2 text-sm font-medium',
            'shadow-sm',
            showOffline
              ? 'bg-amber-500 text-amber-950 dark:bg-amber-600 dark:text-amber-50'
              : 'bg-blue-500 text-blue-50',
            className,
          )}
        >
          {showOffline ? (
            <>
              <CloudOff className="h-4 w-4" aria-hidden="true" />
              <span>You are offline — changes will sync when you reconnect</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Syncing your changes…</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
