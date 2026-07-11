"use client"

import { Radio } from "@base-ui/react/radio"
import { RadioGroup as RadioGroupPrimitive } from "@base-ui/react/radio-group"

import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: RadioGroupPrimitive.Props) {
  return (
    <RadioGroupPrimitive
      data-slot="radio-group"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function RadioGroupItem({ className, ...props }: Radio.Root.Props) {
  return (
    <Radio.Root
      data-slot="radio-group-item"
      className={cn(
        "relative flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-input transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-checked:border-primary dark:bg-input/30",
        className
      )}
      {...props}
    >
      <Radio.Indicator
        data-slot="radio-group-item-indicator"
        className="flex items-center justify-center after:block after:size-1.5 after:rounded-full after:bg-primary"
      />
    </Radio.Root>
  )
}

export { RadioGroup, RadioGroupItem }
