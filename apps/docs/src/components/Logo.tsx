import Image from 'next/image'
import clsx from 'clsx'

import webLogo from '@/images/web-logo.png'

export function Logomark(props: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div {...props}>
      <Image src={webLogo} alt="Lyceum logo" width={28} height={28} className="h-7 w-7 dark:invert" priority />
    </div>
  )
}

export function Logo(props: React.ComponentPropsWithoutRef<'div'>) {
  const { className, ...rest } = props
  return (
    <div className={clsx('flex items-center gap-3', className)} {...rest}>
      <Image src={webLogo} alt="Lyceum logo" width={30} height={30} className="h-7 w-7 dark:invert" priority />
      <span className="text-base font-semibold tracking-tight">Lyceum Docs</span>
    </div>
  )
}
