"use client"

import { ChevronDown } from "lucide-react"
// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

import { Badge } from "@lyceum/ui/ui/badge"
import {
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  } from "@lyceum/ui/ui/menu"
import { Button } from "@lyceum/ui/ui/button"

interface ProductsDropdownProps {
  items: { href: string; label: string; upcoming?: boolean }[]
}

export function ProductsDropdown({ items }: ProductsDropdownProps) {
  const gatewayOrigin = process.env.NEXT_PUBLIC_LOVEUI_URL || ""
  const uiGatewayOrigin = process.env.NEXT_PUBLIC_LOVEUI_UI_URL || ""

  const getLinkProps = (item: { href: string; label: string; upcoming?: boolean }) => {
    const isHomePage = item.href === "/"
    
    // Determine if this should be an external link and construct the URL
    if (gatewayOrigin && !isHomePage) {
      // Non-homepage links go to the main gateway
      return {
        href: `${gatewayOrigin}${item.href}`,
        isExternal: true
      }
    }
    
    if (uiGatewayOrigin && isHomePage) {
      // Homepage links go to the UI gateway
      return {
        href: uiGatewayOrigin,
        isExternal: true
      }
    }
    
    // Default: internal link
    return {
      href: item.href,
      isExternal: false
    }
  }

  return (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" />}>
        Products
        <ChevronDown className="opacity-72" />
      </MenuTrigger>
      <MenuPopup align="center" sideOffset={4}>
        {items.map((item) => {
          const { href, isExternal } = getLinkProps(item)

          return (
            <MenuItem
              key={item.href}
              className="group justify-between"
              render={isExternal ? <a href={href} /> : <Link href={href} />}
            >
              <span className="font-heading text-muted-foreground in-data-highlighted:text-foreground">
                {item.label}
              </span>
              {item.upcoming && (
                <Badge variant="info" size="sm" className="-me-0.5 opacity-0 group-hover:opacity-100 font-medium">
                  Upcoming
                </Badge>
              )}
            </MenuItem>
          )
        })}
      </MenuPopup>
    </Menu>
  )
}
