import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Glass-styled Sonner toaster. On mobile, toasts float above the bottom
 * nav using safe-area-aware offset. Each toast is a glass-thick surface
 * with shadow-ios-3 for a premium feel.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Safe-area aware offset so mobile toasts float above the bottom nav
      offset="calc(env(safe-area-inset-bottom, 0px) + 88px)"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:glass-thick group-[.toaster]:rounded-2xl group-[.toaster]:shadow-ios-3 group-[.toaster]:text-foreground group-[.toaster]:border-transparent",
          title: "group-[.toast]:font-semibold group-[.toast]:tracking-tight",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:shadow-ios-1",
          cancelButton:
            "group-[.toast]:bg-foreground/5 group-[.toast]:text-foreground group-[.toast]:rounded-lg",
          success: "group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-emerald-500/40",
          error: "group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-destructive/50",
          warning: "group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-amber-500/40",
          info: "group-[.toaster]:ring-1 group-[.toaster]:ring-inset group-[.toaster]:ring-primary/30",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
