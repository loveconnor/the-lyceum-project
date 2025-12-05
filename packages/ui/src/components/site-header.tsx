// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

import { siteConfig } from "@lyceum/ui/lib/config"
import { ModeSwitcher } from "@lyceum/ui/components/mode-switcher"
import { ProductLabel } from "@lyceum/ui/components/product-label"
import { ProductsDropdown } from "@lyceum/ui/components/products-dropdown"
import { cn } from "@lyceum/ui/lib/utils"

export function SiteHeader({
  mobileNav,
  children,
  currentProduct,
  className
}: {
  mobileNav?: React.ReactNode;
  children?: React.ReactNode;
  currentProduct?: string;
  className?: string;
}) {
  const gatewayOrigin = process.env.NEXT_PUBLIC_LOVEUI_URL || ""
  const gatewayHome = gatewayOrigin ? `${gatewayOrigin}/` : "/"
  const isExternal = !!gatewayOrigin

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-sidebar/80 backdrop-blur-sm before:absolute before:inset-x-0 before:bottom-0 before:h-px before:bg-border/50",
        className
      )}
    >
      <div className="relative container flex h-(--header-height) w-full items-center justify-between gap-2 px-4 sm:px-6">
        {mobileNav}
        <div className="-mt-0.5 font-heading text-2xl sm:text-[1.625em] flex shrink-0 items-center">
          {isExternal ? (
            <a href={gatewayHome} aria-label="Home">
              love
            </a>
          ) : (
            <Link href={gatewayHome} aria-label="Home">
              love
            </Link>
          )}
          <ProductLabel items={siteConfig.products} currentProduct={currentProduct} />
        </div>
        <div className="ms-auto flex items-center gap-2 md:flex-1 md:justify-end">
          {children}
          <ProductsDropdown items={siteConfig.products} />
          <ModeSwitcher />
        </div>
      </div>
    </header>
  )
}
