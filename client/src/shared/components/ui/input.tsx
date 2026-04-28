import * as React from "react"

import { cn } from "@/shared/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onFocus, ...props }, ref) => {
    // U number inputů po kliknutí označíme celý obsah, aby uživatel mohl
    // hodnotu rovnou přepsat. Bez toho kurzor skočí za "0" a vznikne třeba
    // "015" místo "15". Onfocus z props nadále voláme, pokud je předán.
    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
      if (type === "number") {
        // requestAnimationFrame řeší případy, kdy je focus způsoben kliknutím
        // myši — bez toho prohlížeč po select() znovu nastaví caret podle pozice
        // kliknutí a označení zmizí.
        const target = e.currentTarget
        requestAnimationFrame(() => {
          if (document.activeElement === target) target.select()
        })
      }
      onFocus?.(e)
    }
    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={type}
        onFocus={handleFocus}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
