import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("grid h-12 w-full grid-cols-2 rounded-[14px] bg-[#e7f4e2] p-1", className)}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3 text-sm font-semibold text-[#315c3d] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48] focus-visible:ring-offset-2 data-[state=active]:bg-white data-[state=active]:text-[#005d2e]",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48]", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;
