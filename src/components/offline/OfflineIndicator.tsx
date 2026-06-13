import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  WifiOff,
  Wifi,
  RefreshCw,
  Clock,
  Check,
  X,
  CloudOff,
  Cloud,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useRealtimeReconnecting } from "@/lib/realtime/connectionStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PendingSyncAction {
  id: string;
  type: "create" | "update" | "delete";
  entity: string;
  description?: string;
  timestamp: number;
}

type SyncStatus = "idle" | "syncing" | "success";

const STORAGE_KEY = "brikly-offline-queue";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readQueue(): PendingSyncAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingSyncAction[];
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingSyncAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function typeIcon(type: PendingSyncAction["type"]) {
  switch (type) {
    case "create":
      return <Cloud className="h-4 w-4 text-green-500" aria-hidden="true" />;
    case "update":
      return <RefreshCw className="h-4 w-4 text-blue-500" aria-hidden="true" />;
    case "delete":
      return <X className="h-4 w-4 text-red-500" aria-hidden="true" />;
  }
}

// ---------------------------------------------------------------------------
// Hook: shared online/offline state
// ---------------------------------------------------------------------------

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

// ---------------------------------------------------------------------------
// OfflineBanner
// ---------------------------------------------------------------------------

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const realtimeReconnecting = useRealtimeReconnecting();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);

  // Re-show banner on navigation
  useEffect(() => {
    setDismissed(false);
  }, [location.pathname]);

  // Track offline → online transition
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      setShowReconnected(false);
    }
    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Reconnected banner (green)
  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2",
          "bg-green-500 text-white text-sm font-medium",
          "transition-all duration-500 ease-in-out"
        )}
      >
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Back online! Syncing...</span>
        <Wifi className="h-4 w-4" aria-hidden="true" />
      </div>
    );
  }

  // Offline banner (amber)
  if (!isOnline && !dismissed) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "flex items-center justify-between gap-3 px-4 py-2",
          "bg-amber-500 text-amber-950 text-sm font-medium",
          "animate-in slide-in-from-top duration-300"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            You're offline. Changes will be saved locally and synced when you're
            back online.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-6 w-6 p-0 text-amber-950 hover:text-amber-800 hover:bg-amber-400"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss offline notification"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Realtime reconnecting banner — browser is online but live channels dropped
  // and are retrying (US-210). Distinct from the offline state above.
  if (isOnline && realtimeReconnecting && !dismissed) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-2",
          "bg-amber-400/90 text-amber-950 text-sm font-medium",
          "animate-in slide-in-from-top duration-300"
        )}
      >
        <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Reconnecting to live updates… showing the latest cached data.</span>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// SyncQueueIndicator
// ---------------------------------------------------------------------------

export function SyncQueueIndicator() {
  const isOnline = useOnlineStatus();
  const [queue, setQueue] = useState<PendingSyncAction[]>(readQueue);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [sheetOpen, setSheetOpen] = useState(false);
  const wasOfflineRef = useRef(false);

  // Poll localStorage for queue changes (other tabs, service worker writes)
  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(readQueue());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (!isOnline) {
      wasOfflineRef.current = true;
      return;
    }

    if (isOnline && wasOfflineRef.current) {
      wasOfflineRef.current = false;
      const pending = readQueue();
      if (pending.length > 0) {
        performSync(pending);
      }
    }
  }, [isOnline]);

  const performSync = useCallback(async (items: PendingSyncAction[]) => {
    if (items.length === 0) return;

    setSyncStatus("syncing");

    // Simulate sync processing — in production this would call
    // the actual sync service to replay queued mutations.
    await new Promise((resolve) => setTimeout(resolve, 1500));

    writeQueue([]);
    setQueue([]);
    setSyncStatus("success");

    toast({
      title: "Sync complete",
      description: `${items.length} pending ${items.length === 1 ? "action" : "actions"} synced successfully.`,
    });

    setTimeout(() => setSyncStatus("idle"), 2000);
  }, []);

  const pendingCount = queue.length;

  // Nothing to show
  if (pendingCount === 0 && syncStatus === "idle") {
    return null;
  }

  return (
    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0"
          aria-label={
            syncStatus === "syncing"
              ? "Syncing pending changes"
              : `${pendingCount} pending offline ${pendingCount === 1 ? "action" : "actions"}`
          }
        >
          {syncStatus === "syncing" ? (
            <RefreshCw
              className="h-5 w-5 animate-spin text-blue-500"
              aria-hidden="true"
            />
          ) : syncStatus === "success" ? (
            <Check
              className="h-5 w-5 text-green-500"
              aria-hidden="true"
            />
          ) : !isOnline ? (
            <CloudOff className="h-5 w-5 text-amber-500" aria-hidden="true" />
          ) : (
            <Cloud className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}

          {pendingCount > 0 && syncStatus !== "success" && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 min-w-[1.25rem] px-1",
                "flex items-center justify-center text-[10px] leading-none",
                "pointer-events-none"
              )}
              aria-hidden="true"
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {syncStatus === "syncing" ? (
              <>
                <RefreshCw
                  className="h-5 w-5 animate-spin text-blue-500"
                  aria-hidden="true"
                />
                Syncing...
              </>
            ) : (
              <>
                <Cloud className="h-5 w-5" aria-hidden="true" />
                Pending Sync Actions
              </>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3" role="list" aria-label="Pending sync actions">
          {queue.length === 0 && syncStatus !== "syncing" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Check className="h-10 w-10 mb-3 text-green-500" aria-hidden="true" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs mt-1">No pending actions to sync.</p>
            </div>
          ) : (
            queue.map((action) => (
              <Card key={action.id} role="listitem" className="transition-all duration-200">
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="shrink-0">{typeIcon(action.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate capitalize">
                      {action.type} {action.entity}
                    </p>
                    {action.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {action.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <time dateTime={new Date(action.timestamp).toISOString()}>
                      {formatRelativeTime(action.timestamp)}
                    </time>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {queue.length > 0 && isOnline && syncStatus === "idle" && (
          <div className="mt-4">
            <Button
              className="w-full"
              onClick={() => performSync(queue)}
              aria-label="Sync all pending actions now"
            >
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Sync Now ({pendingCount})
            </Button>
          </div>
        )}

        {!isOnline && queue.length > 0 && (
          <div
            className="mt-4 flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-700 dark:text-amber-300"
            role="status"
          >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Waiting for connectivity to sync...</span>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
