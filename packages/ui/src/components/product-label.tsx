"use client"

// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import { usePathname } from "next/navigation"
import { Badge } from "@lyceum/ui/ui/badge"

interface ProductsDropdownProps {
  items: { href: string; label: string; upcoming?: boolean; }[]
  currentProduct?: string
}

export function ProductLabel({ items, currentProduct }: ProductsDropdownProps) {
  const pathname = usePathname()

  // If currentProduct is explicitly provided, use it
  if (currentProduct) {
    const matchingItem = items.find(item => item.label.toLowerCase() === currentProduct.toLowerCase())

    if (!matchingItem) {
      return null
    }

    return (
      <>
        <span className="text-muted-foreground/64">{matchingItem.label}</span>
        {matchingItem.upcoming && (
          <Badge variant="info" className="max-sm:hidden ms-2 -mt-1 font-sans">
            Upcoming
          </Badge>
        )}
      </>
    )
  }

  // Don't display anything on home page
  if (pathname === "/") {
    return null
  }

  // Get the first segment of the pathname (remove leading slash)
  const firstSegment = pathname.slice(1).split('/')[0]

  // Check if the first segment matches any of the item labels
  const matchingItem = firstSegment ? items.find(item => item.label.toLowerCase() === firstSegment.toLowerCase()) : undefined

  // Only display if we have a match
  if (!matchingItem) {
    return null
  }

  return (
    <>
      <span className="text-muted-foreground/64">{matchingItem.label}</span>
      {matchingItem.upcoming && (
        <Badge variant="info" className="max-sm:hidden ms-2 -mt-1 font-sans">
          Upcoming
        </Badge>
      )}
    </>
  )
}
