'use client'

import { MeshGradient, MeshGradientProps } from '@paper-design/shaders-react'
import { useTheme } from 'next-themes'

type MeshGradientThemeProps = Omit<MeshGradientProps, 'colors'> & {
  lightColors: string[]
  darkColors: string[]
}

export function MeshGradientComponent({ speed, lightColors, darkColors, ...props }: MeshGradientThemeProps) {
  const { resolvedTheme } = useTheme()
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors

  return <MeshGradient {...props} colors={colors} speed={speed ? speed / 10 : 0.25} />
}
