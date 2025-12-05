// @ts-ignore - Next types are supplied by consuming app via peerDependencies
import Link from "next/link"

import { Button } from "@lyceum/ui/ui/button"

export function SiteCta() {
  return (
    <section>
      <div className="container flex w-full items-center justify-center gap-2 px-4 sm:px-6">
        <Button render={<a href="https://i.cal.com/forms/0129f2a8-7b15-4850-b3fb-07944dfacb3c" target="_blank" rel="noreferrer" />}>
          Join the waitlist
        </Button>
        <Button variant="outline" render={<Link href="https://cal.com/jobs" />}>
          Join the company
        </Button>
      </div>
    </section>
  )
}
