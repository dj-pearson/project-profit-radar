import * as React from "react"
import { CheckCircle2, XCircle, Loader2, Clock, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"

export type BulkOperationItemStatus = "pending" | "processing" | "success" | "error" | "skipped"

export interface BulkOperationItem {
  id: string
  label: string
  status: BulkOperationItemStatus
  errorMessage?: string
}

export interface BulkOperationProgressProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  items: BulkOperationItem[]
  onRetryFailed?: () => void
  onClose?: () => void
  allowCloseWhileProcessing?: boolean
}

const statusIcons: Record<BulkOperationItemStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  error: <XCircle className="h-4 w-4 text-destructive" />,
  skipped: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
}

const statusLabels: Record<BulkOperationItemStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  success: "Completed",
  error: "Failed",
  skipped: "Skipped",
}

export function BulkOperationProgress({
  open,
  onOpenChange,
  title,
  description,
  items,
  onRetryFailed,
  onClose,
  allowCloseWhileProcessing = false,
}: BulkOperationProgressProps) {
  const successCount = items.filter((i) => i.status === "success").length
  const errorCount = items.filter((i) => i.status === "error").length
  const skippedCount = items.filter((i) => i.status === "skipped").length
  const processingCount = items.filter((i) => i.status === "processing").length
  const completedCount = successCount + errorCount + skippedCount
  const totalCount = items.length
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
  const isProcessing = processingCount > 0 || (completedCount < totalCount && completedCount > 0)
  const isComplete = completedCount === totalCount && totalCount > 0

  const handleClose = () => {
    if (!isProcessing || allowCloseWhileProcessing) {
      onOpenChange(false)
      onClose?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            {isComplete && errorCount === 0 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            {isComplete && errorCount > 0 && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {isProcessing ? "Processing..." : isComplete ? "Complete" : "Ready"}
              </span>
              <span className="font-medium">
                {completedCount} of {totalCount}
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Summary badges */}
          {isComplete && (
            <div className="flex flex-wrap gap-2">
              {successCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm bg-green-500/10 text-green-600 dark:text-green-400 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {successCount} succeeded
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm bg-destructive/10 text-destructive px-2.5 py-1 rounded-full">
                  <XCircle className="h-3.5 w-3.5" />
                  {errorCount} failed
                </div>
              )}
              {skippedCount > 0 && (
                <div className="flex items-center gap-1.5 text-sm bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2.5 py-1 rounded-full">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {skippedCount} skipped
                </div>
              )}
            </div>
          )}

          {/* Item list */}
          <ScrollArea className="h-[200px] rounded-md border">
            <div className="p-3 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-md text-sm",
                    item.status === "processing" && "bg-primary/5",
                    item.status === "error" && "bg-destructive/5",
                    item.status === "success" && "bg-green-500/5"
                  )}
                >
                  <span className="flex-shrink-0 mt-0.5">{statusIcons[item.status]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    {item.errorMessage && (
                      <p className="text-xs text-destructive mt-0.5">{item.errorMessage}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {statusLabels[item.status]}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isComplete && errorCount > 0 && onRetryFailed && (
            <Button variant="outline" onClick={onRetryFailed}>
              Retry Failed ({errorCount})
            </Button>
          )}
          <Button
            onClick={handleClose}
            disabled={isProcessing && !allowCloseWhileProcessing}
          >
            {isComplete ? "Done" : isProcessing ? "Processing..." : "Close"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook to manage bulk operation state
export interface UseBulkOperationOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  getItemLabel: (item: T) => string
  onProcess: (item: T) => Promise<void>
  onComplete?: (results: { success: string[]; failed: string[]; skipped: string[] }) => void
}

export function useBulkOperation<T>({
  items,
  getItemId,
  getItemLabel,
  onProcess,
  onComplete,
}: UseBulkOperationOptions<T>) {
  const [operationItems, setOperationItems] = React.useState<BulkOperationItem[]>([])
  const [isOpen, setIsOpen] = React.useState(false)

  const initializeItems = React.useCallback(() => {
    setOperationItems(
      items.map((item) => ({
        id: getItemId(item),
        label: getItemLabel(item),
        status: "pending" as const,
      }))
    )
  }, [items, getItemId, getItemLabel])

  const startOperation = React.useCallback(async () => {
    initializeItems()
    setIsOpen(true)

    const results = { success: [] as string[], failed: [] as string[], skipped: [] as string[] }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const id = getItemId(item)

      // Set current item to processing
      setOperationItems((prev) =>
        prev.map((op) => (op.id === id ? { ...op, status: "processing" as const } : op))
      )

      try {
        await onProcess(item)
        setOperationItems((prev) =>
          prev.map((op) => (op.id === id ? { ...op, status: "success" as const } : op))
        )
        results.success.push(id)
      } catch (error: any) {
        setOperationItems((prev) =>
          prev.map((op) =>
            op.id === id
              ? { ...op, status: "error" as const, errorMessage: error?.message || "Operation failed" }
              : op
          )
        )
        results.failed.push(id)
      }
    }

    onComplete?.(results)
  }, [items, getItemId, initializeItems, onProcess, onComplete])

  const retryFailed = React.useCallback(async () => {
    const failedItems = operationItems.filter((op) => op.status === "error")
    const itemsToRetry = items.filter((item) =>
      failedItems.some((failed) => failed.id === getItemId(item))
    )

    // Reset failed items to pending
    setOperationItems((prev) =>
      prev.map((op) => (op.status === "error" ? { ...op, status: "pending" as const, errorMessage: undefined } : op))
    )

    const results = { success: [] as string[], failed: [] as string[], skipped: [] as string[] }

    for (const item of itemsToRetry) {
      const id = getItemId(item)

      setOperationItems((prev) =>
        prev.map((op) => (op.id === id ? { ...op, status: "processing" as const } : op))
      )

      try {
        await onProcess(item)
        setOperationItems((prev) =>
          prev.map((op) => (op.id === id ? { ...op, status: "success" as const } : op))
        )
        results.success.push(id)
      } catch (error: any) {
        setOperationItems((prev) =>
          prev.map((op) =>
            op.id === id
              ? { ...op, status: "error" as const, errorMessage: error?.message || "Operation failed" }
              : op
          )
        )
        results.failed.push(id)
      }
    }
  }, [operationItems, items, getItemId, onProcess])

  return {
    operationItems,
    isOpen,
    setIsOpen,
    startOperation,
    retryFailed,
  }
}
