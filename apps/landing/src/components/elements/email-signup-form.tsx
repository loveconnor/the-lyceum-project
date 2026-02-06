import { clsx } from 'clsx/lite'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function EmailSignupForm({
  label = 'Email address',
  placeholder = 'Enter your email',
  cta,
  variant = 'normal',
  className,
  ...props
}: {
  label?: string
  placeholder?: string
  cta: ReactNode
  variant?: 'normal' | 'overlay'
} & ComponentProps<'form'>) {
  return (
    <form
      className={clsx(
        'flex rounded-full p-1 inset-ring-1 dark:bg-white/10 dark:inset-ring-white/10',
        variant === 'normal' && 'bg-white inset-ring-black/10',
        variant === 'overlay' && 'bg-white/15 inset-ring-white/10',
        className,
      )}
      {...props}
    >
      <Input
        className={clsx(
          'min-w-0 flex-1 rounded-full border-transparent bg-transparent text-sm/7 shadow-none focus-visible:ring-0',
          variant === 'normal' && 'text-mist-950',
          variant === 'overlay' && 'text-white placeholder:text-white/60',
        )}
        type="email"
        aria-label={label}
        placeholder={placeholder}
      />
      <Button
        type="submit"
        className={clsx(
          'rounded-full',
          variant === 'overlay' &&
            'bg-white text-mist-950 hover:bg-mist-100 dark:bg-mist-100 dark:text-mist-950 dark:hover:bg-white',
        )}
      >
        {cta}
      </Button>
    </form>
  )
}
