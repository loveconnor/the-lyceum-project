"use client"

import * as React from "react"
import { Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@lyceum/ui/lib/utils"
import { useCopyToClipboard } from "@lyceum/ui/hooks/use-copy-to-clipboard"
import { Button } from "@lyceum/ui/ui/button"
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@lyceum/ui/ui/tooltip"

export function copyToClipboard(value: string) {
  navigator.clipboard.writeText(value)
}

export function CopyButton({
  value,
  className,
  variant = "ghost",
  ...props
}: React.ComponentProps<typeof Button> & {
  value: string
  src?: string
}) {
  const { isCopied, copyToClipboard } = useCopyToClipboard()

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-slot="copy-button"
            size="icon"
            variant={variant}
            className={cn(
              "absolute top-1.5 right-1.5 z-3 size-9 bg-code opacity-70 hover:opacity-100 focus-visible:opacity-100 sm:size-8",
              className
            )}
            onClick={() => copyToClipboard(value)}
            {...props}
          >
            <span className="sr-only">Copy</span>
            {isCopied ? (
              <HugeiconsIcon icon={Tick02Icon} strokeWidth={2} />
            ) : (
              <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} />
            )}
          </Button>
        }
      />
      <TooltipPopup>{isCopied ? "Copied" : "Copy to Clipboard"}</TooltipPopup>
    </Tooltip>
  )
}

