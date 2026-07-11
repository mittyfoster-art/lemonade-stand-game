import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Summer Pop: zesty yellow with a skeuomorphic "push" edge —
        // pressing translates down and shortens the bottom border.
        default:
          "bg-primary font-bold text-primary-foreground border-b-4 border-pop-zest-deep shadow-[0_10px_20px_rgba(0,0,0,0.1)] hover:brightness-105 active:translate-y-[2px] active:border-b-2",
        destructive:
          "bg-destructive text-destructive-foreground border-b-4 border-red-900 shadow-sm hover:bg-destructive/90 active:translate-y-[2px] active:border-b-2",
        outline:
          "border-2 border-pop-sea/60 bg-background/60 text-secondary shadow-sm hover:bg-pop-sea-mist/30 dark:border-pop-sea-bright/40 dark:text-pop-sea-bright dark:hover:bg-pop-sea/20",
        secondary:
          "bg-secondary font-bold text-secondary-foreground border-b-4 border-pop-charcoal/40 shadow-sm hover:bg-secondary/90 active:translate-y-[2px] active:border-b-2",
        ghost: "hover:bg-accent/20 hover:text-foreground",
        link: "text-secondary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
