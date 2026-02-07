import { Main } from '@/components/elements/main'
import { FooterCategory, FooterLink, FooterWithLinkCategories } from '@/components/sections/footer-with-link-categories'
import { Button } from '@/components/ui/button'
import {
  NavbarLink,
  NavbarLogo,
  NavbarWithLogoActionsAndCenteredLinks,
} from '@/components/sections/navbar-with-logo-actions-and-centered-links'
import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lyceum | AI-Powered Learning Platform',
  description:
    'Lyceum helps learners move from interest to mastery with personalized paths, hands-on labs, and an AI tutor.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Mona+Sans:ital,wdth,wght@0,112.5,200..900;1,112.5,200..900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavbarWithLogoActionsAndCenteredLinks
          id="navbar"
          links={
            <>
              <NavbarLink href="/about">About</NavbarLink>
              <NavbarLink href="https://the-lyceum-project-docs.vercel.app/">Docs</NavbarLink>
            </>
          }
          logo={
            <NavbarLogo href="/" className="items-center">
              <span className="text-xl/7 font-semibold tracking-tight text-mist-950 dark:text-white">Lyceum.</span>
            </NavbarLogo>
          }
          actions={
            <>
              <Button asChild>
                <Link href="/login">Log in</Link>
              </Button>
            </>
          }
        />

        <Main>{children}</Main>

        <FooterWithLinkCategories
          id="footer"
          links={
            <>
              <FooterCategory title="Product">
                <FooterLink href="/#features">Features</FooterLink>
              </FooterCategory>
              <FooterCategory title="Company">
                <FooterLink href="/about">About</FooterLink>
              </FooterCategory>
              <FooterCategory title="Resources">
                <FooterLink href="/#faqs">FAQ</FooterLink>
                <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
              </FooterCategory>
              <FooterCategory title="Legal">
                <FooterLink href="/privacy-policy">Privacy Policy</FooterLink>
              </FooterCategory>
              <FooterCategory title="Connect">
                <FooterLink href="https://github.com/loveconnor/the-lyceum-project">GitHub</FooterLink>
              </FooterCategory>
            </>
          }
          fineprint="© 2026 Lyceum Project"
        />
      </body>
    </html>
  )
}
