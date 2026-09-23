import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

/** Matches Tailwind's `sm` breakpoint: below 640px we render a Drawer. */
export const RESPONSIVE_DIALOG_MOBILE_QUERY = "(max-width: 639px)"

function readMatch(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false
  }
  return window.matchMedia(query).matches
}

/**
 * Reads the media query synchronously on first render so a phone never
 * flashes the desktop Dialog before swapping to the Drawer.
 */
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = React.useState(() =>
    readMatch(RESPONSIVE_DIALOG_MOBILE_QUERY)
  )

  React.useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }
    const mql = window.matchMedia(RESPONSIVE_DIALOG_MOBILE_QUERY)
    const onChange = () => setNarrow(mql.matches)
    onChange()
    mql.addEventListener?.("change", onChange)
    return () => mql.removeEventListener?.("change", onChange)
  }, [])

  return narrow
}

const ResponsiveDialogContext = React.createContext<{ isMobile: boolean }>({
  isMobile: false,
})

const useResponsiveDialog = () => React.useContext(ResponsiveDialogContext)

interface ResponsiveDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultOpen?: boolean
  modal?: boolean
  children?: React.ReactNode
  /** Force a mode (tests, storybook). Defaults to the viewport query. */
  forceMobile?: boolean
}

/**
 * Drop-in replacement for Dialog: a vaul Drawer (bottom sheet with drag to
 * dismiss) below the sm breakpoint, the regular centred Dialog from sm up.
 * Use the ResponsiveDialog* parts exactly as you would the Dialog* parts.
 */
const ResponsiveDialog = ({ forceMobile, children, ...props }: ResponsiveDialogProps) => {
  const narrow = useIsNarrow()
  const isMobile = forceMobile ?? narrow
  const Root = isMobile ? Drawer : Dialog
  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root {...props}>{children}</Root>
    </ResponsiveDialogContext.Provider>
  )
}
ResponsiveDialog.displayName = "ResponsiveDialog"

const ResponsiveDialogTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogTrigger>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Comp = isMobile ? DrawerTrigger : DialogTrigger
  return <Comp ref={ref} {...props} />
})
ResponsiveDialogTrigger.displayName = "ResponsiveDialogTrigger"

const ResponsiveDialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogClose>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Comp = isMobile ? DrawerClose : DialogClose
  return <Comp ref={ref} {...props} />
})
ResponsiveDialogClose.displayName = "ResponsiveDialogClose"

const ResponsiveDialogContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, children, ...props }, ref) => {
  const { isMobile } = useResponsiveDialog()
  if (isMobile) {
    return (
      <DrawerContent
        ref={ref}
        className={cn(
          "max-h-[90dvh] pb-[env(safe-area-inset-bottom)]",
          className,
          // Desktop width caps from the Dialog call site make no sense on a
          // full-width sheet; the inner div scrolls instead of the sheet.
          "max-w-none"
        )}
        {...props}
      >
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
      </DrawerContent>
    )
  }
  return (
    <DialogContent ref={ref} className={className} {...props}>
      {children}
    </DialogContent>
  )
})
ResponsiveDialogContent.displayName = "ResponsiveDialogContent"

const ResponsiveDialogHeader = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerHeader {...props} className={cn("px-0 text-left", props.className)} />
  ) : (
    <DialogHeader {...props} />
  )
}
ResponsiveDialogHeader.displayName = "ResponsiveDialogHeader"

const ResponsiveDialogFooter = (props: React.HTMLAttributes<HTMLDivElement>) => {
  const { isMobile } = useResponsiveDialog()
  return isMobile ? (
    <DrawerFooter {...props} className={cn("px-0", props.className)} />
  ) : (
    <DialogFooter {...props} />
  )
}
ResponsiveDialogFooter.displayName = "ResponsiveDialogFooter"

const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogTitle>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Comp = isMobile ? DrawerTitle : DialogTitle
  return <Comp ref={ref} {...props} />
})
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle"

const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogDescription>
>((props, ref) => {
  const { isMobile } = useResponsiveDialog()
  const Comp = isMobile ? DrawerDescription : DialogDescription
  return <Comp ref={ref} {...props} />
})
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription"

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  useResponsiveDialog,
}
