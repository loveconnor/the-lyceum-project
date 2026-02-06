import NextLink from 'next/link'
import type { ComponentProps } from 'react'

import { Button } from '@/components/ui/button'

export function ButtonLink({
  href,
  size,
  className,
  children,
  ...props
}: {
  href: string
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <Button asChild size={size} className={className}>
      <NextLink href={href} {...props}>
        {children}
      </NextLink>
    </Button>
  )
}

export function PlainButtonLink({
  href,
  size,
  className,
  children,
  ...props
}: {
  href: string
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
} & Omit<ComponentProps<'a'>, 'href'>) {
  return (
    <Button asChild variant="link" size={size} className={className}>
      <NextLink href={href} {...props}>
        {children}
      </NextLink>
    </Button>
  )
}