import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-[10px] border border-[#c9e9c3] bg-white px-3 text-sm text-[#123322] transition-colors duration-200 placeholder:text-[#5e7d68] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#238d48] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
