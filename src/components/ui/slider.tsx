import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-pop-charcoal/20 dark:bg-black/50">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-pop-sea-bright to-pop-lime" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-7 w-7 rounded-full border-[3px] border-pop-sea bg-white shadow-[0_3px_0_rgba(22,29,31,0.25)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-110 disabled:pointer-events-none disabled:opacity-50 touch-none" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
