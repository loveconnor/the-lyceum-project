// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="py-6 mt-8 text-muted-foreground relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-border/50">
      <div className="absolute inset-0 pointer-events-none z-6 container before:absolute before:top-[-3.5px] before:-left-[11.5px] before:z-1 before:-ml-1 before:size-2 before:rounded-[2px] before:bg-popover before:border before:border-border before:shadow-xs before:bg-clip-padding after:absolute after:-right-[11.5px] after:top-[-3.5px] after:z-1 after:-mr-1 after:size-2 after:rounded-[2px] after:bg-background after:border after:border-border after:shadow-xs after:bg-clip-padding" aria-hidden="true"></div>     
      <div className="container flex w-full items-center justify-center gap-2 px-4 sm:px-6">
        <p>© 2025 <Link href="/" className="font-heading text-lg text-foreground">love</Link> – open source, open heart, open mind.</p>
      </div>
    </footer>
  )
}
