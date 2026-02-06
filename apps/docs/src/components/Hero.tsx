import { Button } from '@/components/Button'

export function Hero() {
  return (
    <div className="overflow-hidden border-b border-border bg-background dark:-mt-19 dark:-mb-32 dark:pt-19 dark:pb-32">
      <div className="py-16 sm:px-2 lg:relative lg:px-0 lg:py-20">
        <div className="mx-auto max-w-8xl px-4 lg:px-8 xl:px-12">
          <div className="max-w-3xl">
            <p className="inline bg-linear-to-r from-foreground via-muted-foreground to-foreground bg-clip-text font-display text-5xl tracking-tight text-transparent">
              Build mastery, not just completion.
            </p>
            <p className="mt-3 text-2xl tracking-tight text-muted-foreground">
              Lyceum combines learning paths, labs, reflections, and an AI assistant into one platform for
              deliberate practice.
            </p>
            <div className="mt-8 flex gap-4">
              <Button href="/docs/installation">Get started</Button>
              <Button href="/docs/architecture" variant="secondary">
                View architecture
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
