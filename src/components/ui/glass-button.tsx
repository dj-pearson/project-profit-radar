import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const glassButtonVariants = cva(
  "relative inline-flex items-center justify-center whitespace-nowrap rounded-lg text-base font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-construction-orange focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 overflow-hidden group",
  {
    variants: {
      variant: {
        primary: [
          "bg-gradient-to-r from-orange-500 to-orange-600",
          "text-white shadow-lg shadow-orange-500/50",
          "hover:from-orange-600 hover:to-orange-700",
          "hover:shadow-xl hover:shadow-orange-500/60",
          "hover:scale-105",
          "before:absolute before:inset-0 before:bg-white/20",
          "before:translate-y-full before:transition-transform",
          "hover:before:translate-y-0"
        ],
        secondary: [
          "bg-slate-800/80 backdrop-blur-xl",
          "border border-slate-600/50",
          "text-white",
          "hover:bg-slate-700/80",
          "hover:border-slate-500/50",
          "hover:shadow-lg hover:shadow-slate-900/50"
        ],
        glass: [
          "bg-white/10 backdrop-blur-xl",
          "border border-white/20",
          "text-white",
          "hover:bg-white/20",
          "hover:border-white/30",
          "shadow-lg shadow-black/10"
        ],
        outline: [
          "border-2 border-orange-500",
          "text-orange-500",
          "hover:bg-orange-500/10",
          "hover:border-orange-600"
        ]
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-sm",
        lg: "h-14 px-8 py-4 text-lg",
        icon: "h-12 w-12"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "default"
    }
  }
)

export interface GlassButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof glassButtonVariants> {
  asChild?: boolean
}

const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(glassButtonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
GlassButton.displayName = "GlassButton"

export { GlassButton, glassButtonVariants }
