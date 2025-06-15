
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-neon focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg",
  {
    variants: {
      variant: {
        default: "bg-accent-neon text-black hover:bg-accent-blue shadow-neon",
        secondary:
          "bg-gray-soft text-white border border-gray-700 hover:bg-surface-card hover:text-accent-neon",
        outline:
          "border border-accent-neon text-accent-neon bg-transparent hover:bg-accent-neon hover:text-black",
        ghost: "bg-transparent hover:bg-surface-card text-white",
        link: "text-accent-neon underline-offset-4 hover:underline bg-transparent",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 shadow",
      },
      size: {
        default: "h-11 px-8 py-2 text-base",
        sm: "h-9 rounded-md px-3 text-sm",
        lg: "h-14 rounded-xl px-10 text-lg",
        icon: "h-11 w-11",
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
