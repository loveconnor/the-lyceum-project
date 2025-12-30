import { WaitlistWrapper } from "@/components/box"
import { Alex_Brush } from "next/font/google"
import clsx from "clsx"
import type { Metadata } from "next"
import { siteConfig } from "@/lib/config"

const font = Alex_Brush({
  variable: "--font-alex-brush",
  subsets: ["latin"],
  weight: "400",
})

export const metadata: Metadata = {
  title: {
    template: siteConfig.metadata.titleTemplate,
    default: siteConfig.metadata.defaultTitle,
  },
  description: siteConfig.metadata.defaultDescription,
  icons: [siteConfig.metadata.favicon],
}

export default function Manifesto() {
  const { manifesto } = siteConfig

  return (
    <WaitlistWrapper>
      <div className="flex flex-col gap-10">
        <div className="text-slate-11 [&>p]:tracking-tight [&>p]:leading-[1.6] [&>p:not(:last-child)]:mb-3 text-pretty text-start">
          {manifesto.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-0.5 items-start">
            <p className={clsx("text-slate-12 text-4xl font-medium italic transform -rotate-12", font.className)}>
              {manifesto.author.signatureName}
            </p>
            <p className="text-slate-11 text-sm font-medium">
              {manifesto.author.name} <span className="text-slate-10 text-xs">{manifesto.author.role}</span>
            </p>
          </div>
        </div>
      </div>
    </WaitlistWrapper>
  )
}
