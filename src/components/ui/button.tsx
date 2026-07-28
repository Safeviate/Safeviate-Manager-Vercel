import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

export const BUTTON_INTERACTION_CLASS =
  "shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition-[background-color,border-color,color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-[0_5px_14px_-10px_rgba(15,23,42,0.46)] active:translate-y-0"

export const BUTTON_PRIMARY_SURFACE_CLASS =
  "border border-button-primary-border bg-button-primary text-button-primary-foreground hover:bg-button-primary-accent hover:text-button-primary-accent-foreground"

// Selected navigation must override the neutral surface it sits on.
export const BUTTON_SELECTED_SURFACE_CLASS =
  "border !border-button-primary-border !bg-button-primary !text-button-primary-foreground hover:!bg-button-primary-accent hover:!text-button-primary-accent-foreground"

export const BUTTON_SECONDARY_SURFACE_CLASS =
  "border border-button-secondary-border bg-button-secondary text-button-secondary-foreground hover:bg-button-secondary-accent hover:text-button-secondary-accent-foreground"

export const BUTTON_HEADER_SURFACE_CLASS =
  "border border-[hsl(var(--header-button-border))] bg-[hsl(var(--header-button-background))] text-[hsl(var(--header-button-foreground))] hover:bg-[hsl(var(--header-button-hover))]"

// Header navigation keeps its selected state on the same tenant-configured surface as hover.
export const BUTTON_HEADER_SELECTED_SURFACE_CLASS =
  "border !border-[hsl(var(--header-button-border))] !bg-[hsl(var(--header-button-hover))] !text-[hsl(var(--header-button-foreground))] hover:!bg-[hsl(var(--header-button-hover))]"

export const BUTTON_DESTRUCTIVE_SURFACE_CLASS =
  "border border-destructive bg-destructive text-destructive-foreground hover:border-destructive/90 hover:bg-destructive/90"

export const BUTTON_GHOST_SURFACE_CLASS =
  "border border-transparent bg-transparent text-foreground hover:border-button-secondary-border hover:bg-button-secondary-accent hover:text-button-secondary-accent-foreground"

export const BUTTON_LINK_SURFACE_CLASS =
  "border border-transparent bg-transparent text-button-primary underline-offset-4 hover:bg-button-primary-accent hover:text-button-primary-accent-foreground hover:underline"

const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background ${BUTTON_INTERACTION_CLASS} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_1px_2px_rgba(15,23,42,0.08)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: BUTTON_PRIMARY_SURFACE_CLASS,
        destructive: BUTTON_DESTRUCTIVE_SURFACE_CLASS,
        outline: BUTTON_SECONDARY_SURFACE_CLASS,
        secondary: BUTTON_SECONDARY_SURFACE_CLASS,
        ghost: BUTTON_GHOST_SURFACE_CLASS,
        link: BUTTON_LINK_SURFACE_CLASS,
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        compact: "h-8 px-3 text-[10px] font-bold uppercase tracking-wider gap-1.5", // Standardized Compact Size from ERP Truth
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
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
